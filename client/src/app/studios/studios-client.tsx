"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { StudioCard } from "@/components/studio-card";
import { EmptyState } from "@/components/empty-state";
import { api, Studio, categories, categoryLabels } from "@/lib/api";

export default function StudiosPage() {
  const params = useSearchParams();
  const router = useRouter();
  const category = params.get("category") || "";
  const [query, setQuery] = useState("");
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = category + "\u0000" + query;
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let active = true;
    const search = new URLSearchParams();
    if (category) search.set("category", category);
    if (query.trim()) search.set("q", query.trim());

    api
      .studios(search.size ? "?" + search.toString() : "")
      .then((result) => {
        if (active) {
          setStudios(result.data || []);
          setLoadedKey(requestKey);
        }
      })
      .catch(() => {
        if (active) {
          setStudios([]);
          setLoadedKey(requestKey);
        }
      });

    return () => {
      active = false;
    };
  }, [category, query, requestKey]);

  function choose(value: string) {
    const next = new URLSearchParams(par¶»§q«^uÕ‘¥½Ì¹±•¹Ñ €ü€ (€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÑÕ‘¥¼µÉ¥ˆø(€€€€€€€€€€€íÍÑÕ‘¥½Ì¹µ…À ¡ÍÑÕ‘¥¼¤€ôø€ñMÑÕ‘¥½…É­•äõíÍÑÕ‘¥¼¹}¥‘ôÍÑÕ‘¥¼õíÍÑÕ‘¥½ô€¼ø¥ô(€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€¤€è€ (€€€€€€€€€€ñµÁÑåMÑ…Ñ”(€€€€€€€€€€€Ñ¥Ñ±”ô‰9¼ÍÑÕ‘¥½Ìµ…Ñ Ñ¡½Í”™¥±Ñ•ÉÌˆ(€€€€€€€€€€€‘•ÍÉ¥ÁÑ¥½¸ô‰QÉä„‘¥™™•É•¹Ğ…Ñ•½Éä½È„‰É½…‘•È±½…Ñ¥½¸Í•…É ¸ˆ(€€€€€€€€€€€¡É•˜ôˆ½ÍÑÕ‘¥½Ìˆ(€€€€€€€€€€€Ñ„ô‰I•Í•Ğ™¥±Ñ•ÉÌˆ(€€€€€€€€€€¼ø(€€€€€€€€¥ô(€€€€€€ğ½Í•Ñ¥½¸ø(€€€€ğ½M¥Ñ•M¡•±°ø(€€¤ì)ô(