import dynamic from "next/dynamic";
import { getUserIp } from "@/lib/user-utils";

const ThemeTogglebutton = dynamic(() => import("@/components/Themetoggle"));
const ChatContainer = dynamic(() => import("@/components/ChatContainer"));

export default async function Chat() {
  const userIp = await getUserIp();

  return (
    <>
      <ThemeTogglebutton />
      <ChatContainer userIp={userIp} />
    </>
  );
}
