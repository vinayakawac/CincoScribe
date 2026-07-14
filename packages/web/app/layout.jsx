export const metadata = {
  title: 'CincoScribe Web',
  description: 'Free, open-source transcription and text-to-speech.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
