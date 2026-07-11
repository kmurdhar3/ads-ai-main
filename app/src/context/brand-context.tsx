"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./auth-context";

interface Brand {
  id: string;
  name: string;
  url: string | null;
  updated_at: string;
}

interface BrandContextType {
  activeBrandId: string | null;
  brands: Brand[];
  isLoading: boolean;
  switchBrand: (brandId: string) => void;
  createBrand: () => void;
  refreshBrands: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

const STORAGE_KEY = "activeBrandId";

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load brands list from API
  const refreshBrands = async () => {
    if (!user) {
      setBrands([]);
      setActiveBrandId(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/brands");
      if (res.ok) {
        const data: Brand[] = await res.json();
        setBrands(data);

        // If no active brand set, use the most recent one
        if (!activeBrandId && data.length > 0) {
          const mostRecent = data[0]; // Already sorted by updated_at DESC
          setActiveBrandId(mostRecent.id);
          localStorage.setItem(STORAGE_KEY, mostRecent.id);
        }
      }
    } catch (e) {
      console.error("Failed to load brands:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Load active brand ID from localStorage on mount
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setActiveBrandId(stored);
      }
      refreshBrands();
    } else {
      setActiveBrandId(null);
      setBrands([]);
      setIsLoading(false);
    }
  }, [user]);

  const switchBrand = (brandId: string) => {
    setActiveBrandId(brandId);
    localStorage.setItem(STORAGE_KEY, brandId);
  };

  const createBrand = () => {
    // Clear active brand and route to /brand empty state
    setActiveBrandId(null);
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = "/brand";
  };

  return (
    <BrandContext.Provider
      value={{
        activeBrandId,
        brands,
        isLoading,
        switchBrand,
        createBrand,
        refreshBrands,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
}
