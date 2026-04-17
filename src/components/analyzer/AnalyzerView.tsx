"use client";

import { useData } from "@/components/data/DataProvider";
import { FilterBar } from "@/components/filters/FilterBar";
import { AnalyzerKpis } from "@/components/analyzer/AnalyzerKpis";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { ConversionMatrix } from "@/components/charts/ConversionMatrix";
import { VolumeMatrix } from "@/components/charts/VolumeMatrix";
import { MetroWeightMatrix } from "@/components/charts/MetroWeightMatrix";
import { SwingStateScatter } from "@/components/charts/SwingStateScatter";
import { WeightCliff } from "@/components/charts/WeightCliff";
import { PriceSensitivity } from "@/components/charts/PriceSensitivity";
import { RegionalBleed } from "@/components/charts/RegionalBleed";
import { BootingState, ErrorState } from "@/components/data/LoadingStates";

export function AnalyzerView() {
  const { status, error } = useData();

  if (status === "idle" || status === "booting") return <BootingState />;
  if (status === "error") return <ErrorState message={error ?? "Unknown error"} />;

  return (
    <div className="flex flex-col gap-5 max-w-[1600px] mx-auto w-full">
      <header>
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl md:text-4xl">Analyzer</h1>
          <span className="font-label text-[color:var(--color-on-surface-dim)]">
            Strict mode · Rate Shop × Transaction
          </span>
        </div>
        <p className="mt-1 text-sm text-[color:var(--color-on-surface-muted)] max-w-2xl">
          Segmented win-rate surface. Everything below respects the global filter bar.
        </p>
      </header>

      <FilterBar />
      <AnalyzerKpis />

      <Tabs defaultValue="conversion" className="flex flex-col gap-3">
        <TabsList className="self-start">
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="metro">Metro × Weight</TabsTrigger>
          <TabsTrigger value="swing">Swing State</TabsTrigger>
          <TabsTrigger value="cliff">Weight Cliff</TabsTrigger>
          <TabsTrigger value="price">Price Sensitivity</TabsTrigger>
          <TabsTrigger value="regional">Regional Bleed</TabsTrigger>
        </TabsList>
        <TabsContent value="conversion">
          <ConversionMatrix />
        </TabsContent>
        <TabsContent value="volume">
          <VolumeMatrix />
        </TabsContent>
        <TabsContent value="metro">
          <MetroWeightMatrix />
        </TabsContent>
        <TabsContent value="swing">
          <SwingStateScatter />
        </TabsContent>
        <TabsContent value="cliff">
          <WeightCliff />
        </TabsContent>
        <TabsContent value="price">
          <PriceSensitivity />
        </TabsContent>
        <TabsContent value="regional">
          <RegionalBleed />
        </TabsContent>
      </Tabs>
    </div>
  );
}
