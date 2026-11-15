import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-secondary px-6 text-secondary-foreground">
      <div className="max-w-md">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Signal lost / 404</div>
        <h1 className="font-display mt-3 text-5xl font-extrabold leading-none">No terrain at these coordinates.</h1>
        <p className="mt-4 text-sm opacity-75">This path is not on the survey grid. Return to the planner to keep ranking rehearsal sites.</p>
        <Link href="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" data-testid="link-home">Back to the planner</Link>
      </div>
    </div>
  );
}
