"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  getFirestore,
  type QueryConstraint,
  type Firestore,
} from "firebase/firestore";
import { getClientApp } from "@/lib/firebase/client";

let _db: Firestore | undefined;
function getDb() {
  if (!_db) _db = getFirestore(getClientApp());
  return _db;
}

interface UseRealtimeOptions {
  collectionName: string;
  constraints: QueryConstraint[];
  enabled?: boolean;
}

export function useRealtime<T>({ collectionName, constraints, enabled = true }: UseRealtimeOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const constraintsRef = useRef(constraints);
  constraintsRef.current = constraints;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const db = getDb();
    const q = query(collection(db, collectionName), ...constraintsRef.current);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => doc.data() as T);
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, enabled]);

  return { data, loading, error };
}

export { where, orderBy, limit };
