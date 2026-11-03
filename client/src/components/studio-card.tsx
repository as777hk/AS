"use client";
import Link from "next/link";
import { MapPin, Star, ArrowUpRight, Heart } from "lucide-react";
import { Studio, categoryLabels, api } from "@/lib/api";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
export function StudioCard({studio,onSave,saved=false}:{studio:Studio;onSave?:(id:string)=>void;saved?:boolean}){const [liked,setLiked]=useState(saved);const {data:session}=authClient.useSession();const router=useRouter();async function toggle(e:React.MouseEvent){e.preventDefault();e.stopPropagation();if(!session){router.push(`/login?callbackUrl=${encodeURIComponent(`/studios/${studio._id}`)}`);return}try{const response=await api.toggleWishlist(studio._id);setLiked(response.data.includes(studio._id));onSave?.(studio._id);toast.success(response.data.includes(studio._id)?"Saved to your wishlist":"Removed from saved spaces")}catch(error){toast.error(error instanceof Error?error.message:"Could not update wishlist")}}return <article className="studio-card"><div className="studio-image-wrap"><Link href={`/studios/${studio._id}`}><img src={studio.imageUrl || "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900"} alt={studio.title} loading="lazy" decoding="async"/><span className="category-pill">{categoryLabels[studio.category]||studio.category}</span></Link><button className={liked?"save-button saved":"save-button"} aria-label={liked?"Remove saved ¶»§q«^