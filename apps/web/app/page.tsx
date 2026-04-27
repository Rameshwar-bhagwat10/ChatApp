import type { Chat } from '@chat-app/types';

const foundationSampleChat: Chat = {
  id: 'foundation-chat',
  type: 'group',
  name: 'Foundation Room',
  memberIds: [],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const HomePage = () => (
  <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6">
    <section className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-10 text-center">
      <h1 className="text-3xl font-semibold">Chat App UI Coming Soon</h1>
      <p className="mt-4 text-slate-400">
        App Router and project foundation are ready. Placeholder chat type:{' '}
        {foundationSampleChat.type}
      </p>
    </section>
  </main>
);

export default HomePage;
