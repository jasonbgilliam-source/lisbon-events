"use client";

import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { createClient } from "@supabase/supabase-js";
import EventCard from "@/components/EventCard";
import Link from "next/link";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type EventItem = {
  id: string | number;
  title: string;
  description?: string;
  starts_at: string;
  ends_at?: string;
  location_name?: string;
  address?: string;
  city?: string;
  price?: string;
  age?: string;
  category?: string;
  image_url?: string;
  youtube_url?: string;
  spotify_url?: string;
};

export default function FeaturedPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatured() {
      setLoading(true);
      const todayStart = dayjs().startOf("day").toISOString();
      const todayEnd = dayjs().endOf("day").toISOString();

      const { data, error } = await supabase
        .from("event_submissions_
