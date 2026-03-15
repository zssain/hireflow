"use client";

import { create } from "zustand";
import type { User as FirebaseUser } from "firebase/auth";

interface MembershipSummary {
  membership_id: string;
  tenant_id: string;
  role: string;
  status: string;
}

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  photo_url: string;
}

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  memberships: MembershipSummary[];
  isLoading: boolean;
  isAuthenticated: boolean;
  setFirebaseUser: (user: FirebaseUser | null) => void;
  setSession: (profile: UserProfile, memberships: MembershipSummary[]) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  userProfile: null,
  memberships: [],
  isLoading: true,
  isAuthenticated: false,
  setFirebaseUser: (user) =>
    set({ firebaseUser: user, isAuthenticated: !!user }),
  setSession: (profile, memberships) =>
    set({ userProfile: profile, memberships, isLoading: false }),
  clearAuth: () =>
    set({
      firebaseUser: null,
      userProfile: null,
      memberships: [],
      isAuthenticated: false,
      isLoading: false,
    }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
