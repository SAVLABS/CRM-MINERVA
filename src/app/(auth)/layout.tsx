import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/marca/minerva-logo-horizontal.png"
            alt="Minerva Consultores"
            width={490}
            height={132}
            className="mb-4 h-12 w-auto"
            priority
          />
          <p className="text-sm text-minerva-muted">Sistema CRM</p>
        </div>

        <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-minerva-muted">
          <Link href="/" className="hover:text-minerva-red">
            savlabscr.com
          </Link>
        </p>
      </div>
    </div>
  );
}
