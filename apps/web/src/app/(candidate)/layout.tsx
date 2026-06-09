import { CandidateThemeProvider } from '@/components/candidate/CandidateThemeProvider';

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CandidateThemeProvider>
      <div className="candidate-root">{children}</div>
    </CandidateThemeProvider>
  );
}
