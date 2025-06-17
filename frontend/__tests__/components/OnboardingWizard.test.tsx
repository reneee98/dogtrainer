import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OnboardingWizard from '../../components/OnboardingWizard';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    login: jest.fn(),
    register: jest.fn(),
    user: null,
    token: null,
    loading: false,
    logout: jest.fn(),
  }),
}));

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {component}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('OnboardingWizard', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form by default', () => {
    renderWithProviders(<OnboardingWizard onClose={mockOnClose} />);
    
    expect(screen.getByText('Prihlásenie')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Emailová adresa')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Heslo')).toBeInTheDocument();
  });

  it('switches to registration form when clicking register link', () => {
    renderWithProviders(<OnboardingWizard onClose={mockOnClose} />);
    
    fireEvent.click(screen.getByText('Zaregistrujte sa'));
    
    expect(screen.getByText('Registrácia')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Vaše meno')).toBeInTheDocument();
    expect(screen.getByText('Vyberte rolu')).toBeInTheDocument();
  });

  it('validates required fields on login form', async () => {
    renderWithProviders(<OnboardingWizard onClose={mockOnClose} />);
    
    fireEvent.click(screen.getByText('Prihlásiť sa'));
    
    await waitFor(() => {
      expect(screen.getByText('Neplatná emailová adresa')).toBeInTheDocument();
    });
  });

  it('validates required fields on registration form', async () => {
    renderWithProviders(<OnboardingWizard onClose={mockOnClose} />);
    
    // Switch to registration
    fireEvent.click(screen.getByText('Zaregistrujte sa'));
    
    // Submit empty form
    fireEvent.click(screen.getByText('Zaregistrovať sa'));
    
    await waitFor(() => {
      expect(screen.getByText('Meno musí mať aspoň 2 znaky')).toBeInTheDocument();
    });
  });

  it('validates password confirmation on registration', async () => {
    renderWithProviders(<OnboardingWizard onClose={mockOnClose} />);
    
    // Switch to registration
    fireEvent.click(screen.getByText('Zaregistrujte sa'));
    
    // Fill in mismatched passwords
    fireEvent.change(screen.getByPlaceholderText('Minimálne 6 znakov'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Zopakujte heslo'), {
      target: { value: 'different' },
    });
    
    fireEvent.click(screen.getByText('Zaregistrovať sa'));
    
    await waitFor(() => {
      expect(screen.getByText('Heslá sa nezhodujú')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    renderWithProviders(<OnboardingWizard onClose={mockOnClose} />);
    
    const passwordInput = screen.getByPlaceholderText('Heslo');
    const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    fireEvent.click(toggleButton);
    
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('accepts valid login form submission', async () => {
    const mockLogin = jest.fn().mockResolvedValue({});
    
    // Mock useAuth to return our mock login function
    jest.doMock('../../contexts/AuthContext', () => ({
      useAuth: () => ({
        login: mockLogin,
        register: jest.fn(),
        user: null,
        token: null,
        loading: false,
        logout: jest.fn(),
      }),
    }));

    renderWithProviders(<OnboardingWizard onClose={mockOnClose} />);
    
    fireEvent.change(screen.getByPlaceholderText('Emailová adresa'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Heslo'), {
      target: { value: 'password123' },
    });
    
    fireEvent.click(screen.getByText('Prihlásiť sa'));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
}); 