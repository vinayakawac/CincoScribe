import { KofiButton } from '@cincoscribe/ui';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0f0f0f',
        color: '#fff',
        fontFamily: 'sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
      }}
    >
      <h1 style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0 }}>
        CincoScribe Web
      </h1>
      <p style={{ color: '#888', margin: 0, fontSize: '1.1rem' }}>
        Free, open-source transcription and TTS — coming soon
      </p>
      <KofiButton handle="cincoscribe" />
      <p style={{ color: '#555', fontSize: '0.8rem', margin: 0 }}>
        Stub page — sync and cloud features are scaffolded, not yet built.
      </p>
    </main>
  );
}
