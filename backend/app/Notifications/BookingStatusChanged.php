<?php

namespace App\Notifications;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Fcm\FcmChannel;
use NotificationChannels\Fcm\FcmMessage;
use NotificationChannels\Fcm\Resources\Notification as FcmNotification;

class BookingStatusChanged extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Booking $booking,
        public string $oldStatus,
        public string $newStatus
    ) {
        //
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = [];

        if ($notifiable->email_notifications) {
            $channels[] = 'mail';
        }

        if ($notifiable->push_notifications) {
            $channels[] = FcmChannel::class;
        }

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $statusText = match($this->newStatus) {
            'approved' => 'schválená',
            'rejected' => 'zamietnutá',
            'cancelled' => 'zrušená',
            'completed' => 'dokončená',
            default => $this->newStatus,
        };

        $subject = 'Rezervácia ' . $statusText . ' - ' . $this->booking->dog->name;
        
        $message = (new MailMessage)
                    ->subject($subject)
                    ->greeting('Dobrý deň ' . $notifiable->name . '!')
                    ->line('Stav vašej rezervácie bol zmenený.')
                    ->line('**Detaily rezervácie:**')
                    ->line('Pes: ' . $this->booking->dog->name)
                    ->line('Tréner: ' . $this->booking->trainer->name)
                    ->line('Služba: ' . $this->booking->service_type_text)
                    ->line('Dátum: ' . $this->booking->booking_date->format('d.m.Y'))
                    ->line('Čas: ' . $this->booking->time_range)
                    ->line('**Nový stav:** ' . $this->booking->status_text);

        if ($this->newStatus === 'approved') {
            $message->line('Vaša rezervácia bola schválená! Tešíme sa na vás.')
                   ->action('Zobraziť rezerváciu', url('/bookings/' . $this->booking->id));
        } elseif ($this->newStatus === 'rejected') {
            $message->line('Bohužiaľ, vaša rezervácia bola zamietnutá.')
                   ->when($this->booking->notes, function ($msg) {
                       return $msg->line('Dôvod: ' . $this->booking->notes);
                   })
                   ->line('Môžete skúsiť rezervovať iný termín.');
        } elseif ($this->newStatus === 'cancelled') {
            $message->line('Rezervácia bola zrušená.')
                   ->when($this->booking->cancellation_reason, function ($msg) {
                       return $msg->line('Dôvod zrušenia: ' . $this->booking->cancellation_reason);
                   });
        } elseif ($this->newStatus === 'completed') {
            $message->line('Vaša rezervácia bola úspešne dokončená!')
                   ->line('Ďakujeme, že ste využili naše služby.')
                   ->action('Napísať recenziu', url('/reviews/create?booking=' . $this->booking->id));
        }

        return $message->line('Ďakujeme za používanie našej aplikácie!');
    }

    /**
     * Get the Firebase Cloud Messaging representation of the notification.
     */
    public function toFcm(object $notifiable): FcmMessage
    {
        $statusText = match($this->newStatus) {
            'approved' => 'schválená',
            'rejected' => 'zamietnutá',
            'cancelled' => 'zrušená',
            'completed' => 'dokončená',
            default => $this->newStatus,
        };

        $title = 'Rezervácia ' . $statusText;
        $body = 'Rezervácia pre psa ' . $this->booking->dog->name . ' bola ' . $statusText;

        return (new FcmMessage(notification: new FcmNotification(
                title: $title,
                body: $body,
            )))
            ->data([
                'type' => 'booking_status_changed',
                'booking_id' => $this->booking->id,
                'old_status' => $this->oldStatus,
                'new_status' => $this->newStatus,
                'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
            ]);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'booking_status_changed',
            'booking_id' => $this->booking->id,
            'dog_name' => $this->booking->dog->name,
            'trainer_name' => $this->booking->trainer->name,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'booking_date' => $this->booking->booking_date->toDateString(),
        ];
    }
} 