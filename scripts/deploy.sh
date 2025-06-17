#!/bin/bash

# Dog Booking System - Deployment Script for DigitalOcean
# This script sets up the complete production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Configuration
PROJECT_DIR="/opt/dog-booking-system"
DOMAIN="dogbooking.sk"
EMAIL="admin@dogbooking.sk"

print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    DOG BOOKING SYSTEM                       ║"
    echo "║                 Production Deployment                       ║"
    echo "║                    DigitalOcean Setup                       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if script is run as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    apt update && apt upgrade -y
    
    log "Installing essential packages..."
    apt install -y \
        curl \
        wget \
        git \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        htop \
        nano \
        ufw \
        fail2ban \
        logrotate \
        cron
}

# Configure firewall
setup_firewall() {
    log "Configuring firewall..."
    
    # Reset UFW
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    ufw allow 22
    
    # Allow HTTP/HTTPS
    ufw allow 80
    ufw allow 443
    
    # Allow specific monitoring ports (restricted to localhost)
    ufw allow from 127.0.0.1 to any port 3001  # Grafana
    ufw allow from 127.0.0.1 to any port 9090  # Prometheus
    
    # Enable firewall
    ufw --force enable
    
    log "Firewall configured successfully"
}

# Install Docker
install_docker() {
    log "Installing Docker..."
    
    # Remove old versions
    apt remove -y docker docker-engine docker.io containerd runc || true
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Add current user to docker group (if not root)
    if [[ -n "$SUDO_USER" ]]; then
        usermod -aG docker $SUDO_USER
        log "Added $SUDO_USER to docker group"
    fi
    
    log "Docker installed successfully"
}

# Install Docker Compose
install_docker_compose() {
    log "Installing Docker Compose..."
    
    # Download latest Docker Compose
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # Make executable
    chmod +x /usr/local/bin/docker-compose
    
    # Create symlink
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log "Docker Compose ${DOCKER_COMPOSE_VERSION} installed successfully"
}

# Install AWS CLI
install_aws_cli() {
    log "Installing AWS CLI..."
    
    # Download and install AWS CLI v2
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    ./aws/install
    rm -rf awscliv2.zip aws/
    
    log "AWS CLI installed successfully"
}

# Setup SSL certificates with Let's Encrypt
setup_ssl() {
    log "Setting up SSL certificates with Let's Encrypt..."
    
    # Install Certbot
    apt install -y certbot python3-certbot-nginx
    
    # Create SSL directory
    mkdir -p /opt/dog-booking-system/ssl
    
    # Generate certificates (replace with your domains)
    log "Generating SSL certificates for ${DOMAIN}..."
    
    # Stop nginx if running
    systemctl stop nginx 2>/dev/null || true
    
    # Generate certificates
    certbot certonly --standalone \
        --email ${EMAIL} \
        --agree-tos \
        --no-eff-email \
        -d ${DOMAIN} \
        -d www.${DOMAIN} \
        -d api.${DOMAIN} \
        -d monitoring.${DOMAIN}
    
    # Copy certificates to project directory
    cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem /opt/dog-booking-system/ssl/
    cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem /opt/dog-booking-system/ssl/
    
    # Set permissions
    chmod 644 /opt/dog-booking-system/ssl/fullchain.pem
    chmod 600 /opt/dog-booking-system/ssl/privkey.pem
    
    # Setup auto-renewal
    echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'cp /etc/letsencrypt/live/${DOMAIN}/*.pem /opt/dog-booking-system/ssl/ && docker-compose -f /opt/dog-booking-system/docker-compose.prod.yml restart nginx-proxy'" | crontab -
    
    log "SSL certificates configured successfully"
}

# Setup project directory
setup_project() {
    log "Setting up project directory..."
    
    # Create project directory
    mkdir -p ${PROJECT_DIR}
    cd ${PROJECT_DIR}
    
    # Clone repository (replace with your repository URL)
    if [[ ! -d ".git" ]]; then
        git clone https://github.com/yourusername/dog-booking-system.git .
    else
        git pull origin main
    fi
    
    # Create necessary directories
    mkdir -p backups
    mkdir -p ssl
    mkdir -p monitoring/grafana/provisioning
    mkdir -p logs
    
    # Set permissions
    chown -R $SUDO_USER:$SUDO_USER ${PROJECT_DIR}
    chmod +x scripts/*.sh
    
    log "Project directory setup complete"
}

# Setup environment variables
setup_environment() {
    log "Setting up environment variables..."
    
    # Create .env file for production
    cat > ${PROJECT_DIR}/.env << EOF
# Environment
APP_ENV=production
APP_DEBUG=false
NODE_ENV=production

# Docker Registry
DOCKER_REGISTRY=your-registry.com
IMAGE_TAG=latest

# Database
DB_DATABASE=dog_booking
DB_USERNAME=dog_user
DB_PASSWORD=$(openssl rand -base64 32)
DB_ROOT_PASSWORD=$(openssl rand -base64 32)

# Redis
REDIS_PASSWORD=$(openssl rand -base64 32)

# Application
APP_KEY=base64:$(openssl rand -base64 32)
API_URL=https://api.${DOMAIN}

# AWS
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=eu-central-1
AWS_BUCKET=dog-booking-uploads
BACKUP_BUCKET=dog-booking-backups

# Email
MAILGUN_DOMAIN=your-domain
MAILGUN_SECRET=your-secret

# Monitoring
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)
SENTRY_DSN=your-sentry-dsn

# Backup
RETENTION_DAYS=30
EOF

    # Set permissions
    chmod 600 ${PROJECT_DIR}/.env
    chown $SUDO_USER:$SUDO_USER ${PROJECT_DIR}/.env
    
    warning "Please update the .env file with your actual credentials!"
    log "Environment variables template created"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create Prometheus config
    mkdir -p ${PROJECT_DIR}/monitoring
    cat > ${PROJECT_DIR}/monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-proxy:80']

  - job_name: 'mariadb'
    static_configs:
      - targets: ['mariadb:3306']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
EOF

    log "Monitoring configuration created"
}

# Setup log rotation
setup_logrotate() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/dog-booking-system << EOF
${PROJECT_DIR}/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $SUDO_USER $SUDO_USER
    postrotate
        docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml restart nginx-proxy 2>/dev/null || true
    endscript
}
EOF

    log "Log rotation configured"
}

# Setup fail2ban
setup_fail2ban() {
    log "Setting up fail2ban..."
    
    # Create custom jail for nginx
    cat > /etc/fail2ban/jail.d/nginx.conf << EOF
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = ${PROJECT_DIR}/logs/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = ${PROJECT_DIR}/logs/nginx/error.log
maxretry = 10
bantime = 3600
findtime = 600
EOF

    # Restart fail2ban
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    log "Fail2ban configured"
}

# Setup cron jobs
setup_cron() {
    log "Setting up cron jobs..."
    
    # Laravel scheduler
    echo "* * * * * cd ${PROJECT_DIR} && docker-compose -f docker-compose.prod.yml exec -T backend php artisan schedule:run >> /dev/null 2>&1" | crontab -u $SUDO_USER -
    
    # System maintenance
    echo "0 3 * * 0 docker system prune -f" | crontab -
    
    log "Cron jobs configured"
}

# Setup swap file
setup_swap() {
    log "Setting up swap file..."
    
    # Check if swap already exists
    if [[ $(swapon --show | wc -l) -eq 0 ]]; then
        # Create 2GB swap file
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        
        # Make permanent
        echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
        
        log "Swap file created and activated"
    else
        log "Swap already configured"
    fi
}

# Performance tuning
performance_tuning() {
    log "Applying performance tuning..."
    
    # Kernel parameters
    cat >> /etc/sysctl.conf << EOF

# Dog Booking System Performance Tuning
vm.swappiness=10
vm.dirty_background_ratio=5
vm.dirty_ratio=10
net.core.rmem_max=134217728
net.core.wmem_max=134217728
net.ipv4.tcp_rmem=4096 87380 134217728
net.ipv4.tcp_wmem=4096 65536 134217728
net.ipv4.tcp_congestion_control=bbr
net.core.default_qdisc=fq
EOF

    # Apply changes
    sysctl -p
    
    log "Performance tuning applied"
}

# Final deployment
deploy_application() {
    log "Deploying application..."
    
    cd ${PROJECT_DIR}
    
    # Load environment variables
    source .env
    
    # Pull and start services
    docker-compose -f docker-compose.prod.yml pull
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for database to be ready
    sleep 30
    
    # Run initial setup
    docker-compose -f docker-compose.prod.yml exec -T backend php artisan migrate --force
    docker-compose -f docker-compose.prod.yml exec -T backend php artisan db:seed --force
    docker-compose -f docker-compose.prod.yml exec -T backend php artisan storage:link
    
    # Cache configuration
    docker-compose -f docker-compose.prod.yml exec -T backend php artisan config:cache
    docker-compose -f docker-compose.prod.yml exec -T backend php artisan route:cache
    docker-compose -f docker-compose.prod.yml exec -T backend php artisan view:cache
    
    log "Application deployed successfully"
}

# Health check
health_check() {
    log "Performing health check..."
    
    sleep 60  # Wait for services to be fully ready
    
    # Check if services are running
    if docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml ps | grep -q "Up"; then
        log "✅ Docker services are running"
    else
        error "❌ Some Docker services are not running"
        return 1
    fi
    
    # Check if ports are listening
    if netstat -tuln | grep -q ":80\|:443"; then
        log "✅ Web server is listening on ports 80/443"
    else
        error "❌ Web server is not listening on expected ports"
        return 1
    fi
    
    log "✅ Health check passed"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -rf /tmp/dog-booking-setup-*
}

# Print deployment summary
print_summary() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    DEPLOYMENT COMPLETE!                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
    echo "🎉 Dog Booking System has been successfully deployed!"
    echo
    echo "📋 Next Steps:"
    echo "1. Update the .env file with your actual credentials"
    echo "2. Configure your DNS to point to this server"
    echo "3. Access your application at: https://${DOMAIN}"
    echo "4. Access monitoring at: https://monitoring.${DOMAIN}"
    echo "5. Check logs: docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml logs -f"
    echo
    echo "🔧 Useful Commands:"
    echo "• Check status: docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml ps"
    echo "• View logs: docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml logs"
    echo "• Restart services: docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml restart"
    echo "• Update application: cd ${PROJECT_DIR} && git pull && docker-compose -f docker-compose.prod.yml up -d --build"
    echo
    echo "📞 Support: If you need help, check the documentation or contact support."
    echo
}

# Main execution function
main() {
    print_banner
    
    # Pre-flight checks
    check_root
    
    # System setup
    update_system
    setup_firewall
    setup_swap
    performance_tuning
    
    # Install required software
    install_docker
    install_docker_compose
    install_aws_cli
    
    # SSL setup
    setup_ssl
    
    # Project setup
    setup_project
    setup_environment
    setup_monitoring
    
    # Security and maintenance
    setup_logrotate
    setup_fail2ban
    setup_cron
    
    # Deploy application
    deploy_application
    
    # Final checks
    health_check
    
    # Cleanup
    cleanup
    
    # Summary
    print_summary
}

# Error handling
trap 'error "Deployment failed on line $LINENO. Check the logs for details."; cleanup; exit 1' ERR

# Help function
show_help() {
    echo "Dog Booking System Deployment Script"
    echo
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -d, --domain   Set domain name (default: dogbooking.sk)"
    echo "  -e, --email    Set email for SSL certificates (default: admin@dogbooking.sk)"
    echo
    echo "Example:"
    echo "  sudo $0 --domain mydomain.com --email admin@mydomain.com"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main "$@" 