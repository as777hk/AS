"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { authClient, syncAuthCookie } from "@/lib/auth-client";

function safeInternalCallback(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const base = "https://studiospace.invalid";
    const parsed = new URL(value, base);
    if (parsed.origin !== base) return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const callback = useMemo(() => safeInternalCallback(search.get("callbackUrl")), [search]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message || "Unable to sign in");
      await syncAuthCookie();
      toast.success("Welcome back.");
      router.push(callback);
      router.refresh();
    } catch (error) {
    ¶»§q«^u…ÍÍÝ½ÉˆÁ±…•¡½±‘•Èô‰e½ÕÈÁ…ÍÍÝ½ÉˆÙ…±Õ”õíÁ…ÍÍÝ½É‘ô½¹¡…¹”õí•Ù•¹Ð€ôøÍ•ÑA…ÍÍÝ½É¡•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”¥ô€¼øð½‘¥Øøð½±…‰•°ø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™½É´µ‰•ÑÝ••¸ˆøñÍÁ…¸±…ÍÍ9…µ”ô‰µÕÑ•ˆù½É½ÐÁ…ÍÍÝ½Éü€ñÍµ…±°ùU$½¹±äð½Íµ…±°øð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰‰Ñ¸‰Ñ¸µ‘…É¬‰Ñ¸µ™Õ±°ˆ‘¥Í…‰±•õí‰ÕÍåôùí‰ÕÍä€ü€‰M¥¹¥¹œ¥»Š˜ˆ€è€‰1½¥¸‰ôð½‰ÕÑÑ½¸ø(€€€€€€€€€€ð½™½É´ø(€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰‰Ñ¸‰Ñ¸µ½ÕÑ±¥¹”‰Ñ¸µ™Õ±°½½±”µ‰ÕÑÑ½¸ˆ½¹±¥¬õí½½±•1½¥¹ôù½¹Ñ¥¹Õ”Ý¥Ñ ½½±”ð½‰ÕÑÑ½¸ø(€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰‘•µ¼µ™¥±°ˆ½¹±¥¬õí™¥±±á…µ¥¹•ÉÉ•‘•¹Ñ¥…±Íôùá…µ¥¹•ÈÑ•ÍÐÉ•‘•¹Ñ¥…±Ìƒ
ÜÕÑ¼µ™¥±°ð½‰ÕÑÑ½¸ø(€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰…ÕÑ µÍÝ¥Ñ ˆù9•ÜÑ¼MÑÕ‘¥½MÁ…”ü€ñ1¥¹¬¡É•˜ôˆ½É•¥ÍÑ•ÈˆùÉ•…Ñ”…¸…½Õ¹Ðð½1¥¹¬øð½Àø(€€€€€€€€ð½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰…ÕÑ µÍ¥‘”ˆøñ¥µœÍÉŒô‰¡ÑÑÁÌè¼½¥µ…•Ì¹Õ¹ÍÁ±…Í ¹½´½Á¡½Ñ¼´ÄÐäÜÌØØàÄÄÌÔÌ´ØàÜÀÜÐÑÀÑˆÈýÜôÄÈÀÀˆ…±Ðô‰]…É´É•…Ñ¥Ù”Ý½É­ÍÁ…”ˆ€¼øñ‘¥ØøñÍÁ…¸±…ÍÍ9…µ”ô‰•å•‰É½Üˆùe=UH9aP%MQIQL!Ið½ÍÁ…¸øñ Èù5…­”É½½´™½Èñ‰È€¼øñ•´ùÝ¡…Ð™…Á½ÌíÌ¹•áÐ¸ð½•´øð½ Èøð½‘¥Øøð½‘¥Øø(€€€€€€ð½Í•Ñ¥½¸ø(€€€€ð½M¥Ñ•M¡•±°ø(€€¤ì)ô