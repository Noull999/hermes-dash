'use client';

import ClientLayout from '@/components/ui/ClientLayout';
import ChatView from '@/components/chat/ChatView';

export default function ChatPage() {
  return (
    <ClientLayout>
      <div className="flex flex-col h-[calc(100dvh-64px)]">
        <div className="flex-1 overflow-hidden">
          <ChatView />
        </div>
      </div>
    </ClientLayout>
  );
}
