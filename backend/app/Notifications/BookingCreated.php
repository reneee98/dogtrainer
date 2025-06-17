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

class BookingCreated extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Booking $booking
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
        return (new MailMessage)
                    ->subject('Nová rezervácia - ' . $this->booking->dog->name)
                    ->greeting('Dobrý deň ' . $notifiable->name . '!')
                    ->line('Máte novú rezerváciu na schválenie.')
                    ->line('**Detaily rezervácie:**')
                    ->line('Pes: ' . $this->booking->dog->name)
                    ->line('Majiteľ: ' . $this->booking->dog->owner->name)
                    ->line('Služba: ' . $this->booking->service_type_text)
                    ->line('Dátum: ' . $this->booking->booking_date->format('d.m.Y'))
                    ->line('Čas: ' . $this->booking->time_range)
                    ->when($this->booking->notes, function ($message) {
                        return $message->line('Poznámky: ' . $this->booking->notes);
                    })
                    ->when($this->booking->special_requirements, function ($message) {
                        return $message->line('Špeciálne požiadavky: ' . $this->booking->special_requirements);
                    })
                    ->action('Zobraziť rezerváciu', url('/bookings/' . $this->booking->id))
                    ->line('Ďakujeme za používanie našej aplikácie!');
    }

    /**
     * Get the Firebase Cloud Messaging representation of the notification.
     */
    public function toFcm(object $notifiable): FcmMessage
    {
        return (new FcmMessage(notification: new FcmNotification(
                title: 'Nová rezervácia',
                body: 'Máte novú rezerváciu od ' . $this->booking->dog->owner->name . ' pre psa ' . $this->booking->dog->name,
            )))
            ->data([
                'type' => 'booking_created',
                'booking_id' => $this->booking->id,
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
            'type' => 'booking_created',
            'booking_id' => $this->booking->id,
            'dog_name' => $this->booking->dog->name,
            'owner_name' => $this->booking->dog->owner->name,
            'service_type' => $this->booking->service_type,
            'booking_date' => $this->booking->booking_date->toDateString(),
            'start_time' => $this->booking->start_time,
        ];
    }
} 