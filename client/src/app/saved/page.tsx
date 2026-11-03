"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { authClient } from "@/lib/auth-client";
import { api, Studio } from "@/lib/api";
import { StudioCard } from "@/components/studio-card";
import { EmptyState } from "@/components/empty-state";

export default function SavedPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [items, setItems] = useState<Studio[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const userId = session?.user?.id;
    if (isPending || !userId) return;

    let active = true;
    api
      .wishlist()
      .then(({ data: ids }) =>
        Promise.all(ids.map((id) => api.studio(id).then((result) => result.data).catch(() => null))),
      )
      .then((result) => {
        if (active) {
          setItems(result.filter((studio): studio is Studio => studio !== null));
          setLoaded(true);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Could not load saved studios");
          setLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, [isPending, session?.user?.id]);

  useEffect(() => {
    if (!isPending && !session) router.replace("/login?callbackUrl=%2Fsaved");
  }, [isPe¶»§q«^