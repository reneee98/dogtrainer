<?php

namespace App\Notifications;

use App\Models\Session;
use App\Models\Dog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Fcm\FcmChannel;
use NotificationChannels\Fcm\FcmMessage;
use NotificationChannels\Fcm\Resources\Notification as FcmNotification;

class WaitlistNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Session $session,
        public Dog $dog
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
                    ->subject('Voľné miesto v tréningu - ' . $this->session->title)
                    ->greeting('Dobrý deň ' . $notifiable->name . '!')
                    ->line('Máme dobrú správu! Uvoľnilo sa miesto v tréningu, na ktorý ste sa prihlásili do čakacej listiny.')
                    ->line('**Detaily tréningu:**')
                    ->line('Názov: ' . $this->session->title)
                    ->line('Tréner: ' . $this->session->trainer->name)
                    ->line('Dátum: ' . $this->session->start_time->format('d.m.Y'))
                    ->line('Čas: ' . $this->session->time_range)
                    ->line('Miesto: ' . $this->session->location)
                    ->line('Pes: ' . $this->dog->name)
                    ->line('**Pozor!** Toto miesto si môžete rezervovať len po obmedzený čas. Neváhajte a prihláste sa!')
                    ->action('Prihlásiť sa na tréning', url('/sessions/' . $this->session->id . '/signup'))
                    ->line('Ak sa už na tréning nechcete prihlásiť, môžete sa odstrániť z čakacej listiny.')
                    ->line('Ďakujeme za používanie našej aplikácie!');
    }

    /**
     * Get the Firebase Cloud Messaging representation of the notification.
     */
    public function toFcm(object $notifiable): FcmMessage
    {
        return (new FcmMessage(notification: new FcmNotification(
                title: 'Voľné miesto v tréningu!',
                body: 'Uvoľnilo sa miesto v tréningu "' . $this->session->title . '" pre psa ' . $this->dog->name,
            )))
            ->data([
                'type' => 'waitlist_spot_available',
                'session_id' => $this->session->id,
                'dog_id' => $this->dog->id,
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
            'type' => 'waitlist_spot_available',
            'session_id' => $this->session->id,
            'session_title' => $this->session->title,
            'dog_id' => $this->dog->id,
            'dog_name' => $this->dog->name,
            'session_date' => $this->session->start_time->toDateString(),
            'session_time' => $this->session->start_time->format('H:i'),
        ];
    }
} 