import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import MarketingNav from '@/components/marketing/Nav';
import AppPreview from '@/components/marketing/AppPreview';

export const metadata = {
  title: 'CollabSpace – write, plan and collaborate',
  description: 'Pages, tasks and real-time teamwork in one calm workspace.',
};

const FEATURES = [
  {
    id: 'write', title: 'Write', tint: 'bg-sand',
    lead: 'A page editor that stays out of your way.',
    points: ['Type / for headings, to-dos, tables, code and dividers', 'Embed images by URL', 'Nested pages with breadcrumbs'],
  },
  {
    id: 'collaborate', title: 'Collaborate', tint: 'bg-accent-soft',
    lead: 'Work on the same page at the same time.',
    points: ['See teammates’ cursors and edits live', 'Comment threads you can resolve', 'Version history with one-click restore'],
  },
  {
    id: 'organize', title: 'Organize', tint: 'bg-sage',
    lead: 'Keep every project in its place.',
    points: ['Workspaces with Owner, Admin, Editor and Viewer roles', 'Kanban task board with assignees and due dates', 'Search everything with Ctrl K'],
  },
];

export default async function Home() {
  if (await getUser()) redirect('/start');
  return (
    <>
      <MarketingNav />
      <main>
        <section className="mx-auto max-w-4xl px-6 pb-12 pt-20 text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Write, plan and <span className="rounded-full bg-sage px-4">collaborate</span> together.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-700">
            Pages, tasks and real-time teamwork in one calm workspace for small teams.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="rounded-md bg-accent px-5 py-2.5 font-medium text-white hover:bg-accent-dark">Get started free</Link>
            <Link href="/login" className="rounded-md bg-accent-soft px-5 py-2.5 font-medium text-accent-dark hover:bg-[#d9e8f3]">Log in</Link>
          </div>
        </section>

        <section className="px-6 pb-20"><AppPreview /></section>

        <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.id} id={f.id} className={`scroll-mt-24 rounded-xl p-6 ${f.tint}`}>
              <h2 className="text-2xl font-bold">{f.title}</h2>
              <p className="mt-2 text-gray-800">{f.lead}</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-800">
                {f.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </article>
          ))}
        </section>

        <section id="pricing" className="scroll-mt-24 mx-auto max-w-md px-6 pb-20 text-center">
          <h2 className="text-3xl font-bold">Pricing</h2>
          <div className="mt-6 rounded-xl border border-[#e9e9e7] bg-white p-6">
            <div className="text-4xl font-bold">Free</div>
            <p className="mt-2 text-gray-700">Everything described above is included.</p>
            <Link href="/register" className="mt-5 inline-block rounded-md bg-accent px-5 py-2.5 font-medium text-white hover:bg-accent-dark">Get started free</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e9e9e7]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-gray-600">
          <span>© {new Date().getFullYear()} CollabSpace</span>
          <span className="flex gap-4">
            <Link href="/login" className="hover:underline">Log in</Link>
            <Link href="/register" className="hover:underline">Sign up</Link>
          </span>
        </div>
      </footer>
    </>
  );
}