import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../../state/authStore';
import { useUiStore } from '../../state/uiStore';
import { GlassButton, GlassPanel } from '../ui';

interface VoiceParticipant {
  userId: string;
  name: string;
  muted: boolean;
  speaking: boolean;
}

interface VoiceControlProps {
  projectId: string;
  socket: Socket | null;
  socketConnected: boolean;
}

export function VoiceControl({ projectId, socket, socketConnected }: VoiceControlProps) {
  const { user } = useAuth();
  const { pushToast } = useUiStore();

  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<VoiceParticipant[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopAudioStream = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopAudioStream();
      if (socket?.connected && joined) {
        socket.emit('voice:leave', { projectId });
      }
    };
  }, [projectId, socket, joined]);

  useEffect(() => {
    if (!socket) return;
    const handleVoiceUpdate = (payload: { participants?: VoiceParticipant[] }) => {
      if (Array.isArray(payload?.participants)) {
        setRemoteParticipants(payload.participants);
      }
    };
    socket.on('voice:participants', handleVoiceUpdate);
    return () => {
      socket.off('voice:participants', handleVoiceUpdate);
    };
  }, [socket]);

  const handleJoin = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      pushToast(
        'Microphone unavailable',
        'error',
        'Voice capture requires a browser with microphone media permissions.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setJoined(true);
      setMuted(false);
      if (socket && socketConnected) {
        socket.emit('voice:join', { projectId });
      } else {
        pushToast(
          'Voice local preview active',
          'info',
          'Audio stream ready; live peer relay activates when voice signaling connects.'
        );
      }
    } catch {
      pushToast(
        'Microphone permission denied',
        'error',
        'Allow microphone access in browser settings to join the voice channel.'
      );
    }
  };

  const handleLeave = () => {
    stopAudioStream();
    setJoined(false);
    setMuted(false);
    setPopoverOpen(false);
    if (socket && socketConnected) {
      socket.emit('voice:leave', { projectId });
    }
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (streamRef.current) {
      for (const track of streamRef.current.getAudioTracks()) {
        track.enabled = !nextMuted;
      }
    }
    if (socket && socketConnected) {
      socket.emit('voice:mute', { projectId, muted: nextMuted });
    }
  };

  const allParticipants: VoiceParticipant[] = joined
    ? [
        {
          userId: user?.id ?? 'self',
          name: `${user?.name ?? 'You'} (You)`,
          muted,
          speaking: !muted,
        },
        ...remoteParticipants.filter((p) => p.userId !== user?.id),
      ]
    : remoteParticipants;

  if (!joined) {
    return (
      <GlassButton
        size="sm"
        variant="glass"
        onClick={() => void handleJoin()}
        title="Join voice session"
      >
        <Mic className="w-3.5 h-3.5 text-[var(--text-secondary)]" strokeWidth={1.5} />
        <span className="hidden xl:inline">Voice</span>
      </GlassButton>
    );
  }

  return (
    <div className="relative flex items-center gap-1">
      <GlassButton
        size="sm"
        variant={muted ? 'glass' : 'primary'}
        onClick={toggleMute}
        aria-pressed={muted}
        aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
        title={muted ? 'Unmute microphone' : 'Mute microphone'}
      >
        {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        <span className="hidden lg:inline">{muted ? 'Muted' : 'Live'}</span>
      </GlassButton>

      <button
        type="button"
        onClick={() => setPopoverOpen((prev) => !prev)}
        aria-expanded={popoverOpen}
        aria-label="Voice channel participants"
        className="h-8 px-2 rounded-md bg-[var(--surface-elevated)] border border-[var(--border-hairline)] text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1 cursor-pointer"
      >
        <Volume2 className="w-3 h-3 text-[var(--state-success)]" />
        <span>{allParticipants.length}</span>
      </button>

      <button
        type="button"
        onClick={handleLeave}
        aria-label="Leave voice session"
        title="Leave voice session"
        className="h-8 px-2 rounded-md bg-[var(--state-danger-bg)] border border-[var(--state-danger-border)] text-[#fca5a5] hover:bg-[#ef4444]/25 inline-flex items-center cursor-pointer"
      >
        <PhoneOff className="w-3.5 h-3.5" />
      </button>

      {popoverOpen && (
        <GlassPanel
          variant="elevated"
          className="absolute right-0 top-full mt-2 w-60 p-3 z-50 space-y-2 text-[12px]"
        >
          <p className="text-[11px] font-mono uppercase text-[var(--text-muted)]">
            Voice Participants ({allParticipants.length})
          </p>
          <ul className="space-y-1.5">
            {allParticipants.map((p) => (
              <li key={p.userId} className="flex items-center justify-between gap-2">
                <span className="truncate text-[var(--text-primary)]">{p.name}</span>
                {p.muted ? (
                  <MicOff className="w-3.5 h-3.5 text-[#fca5a5] shrink-0" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-[var(--state-success)] shrink-0" />
                )}
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}
    </div>
  );
}
