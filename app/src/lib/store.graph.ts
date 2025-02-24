import create from "zustand";

import { GraphOptionsObject } from "./constants";

export type StoreGraph = {
  layout: GraphOptionsObject["layout"];
  setLayout: (layout: GraphOptionsObject["layout"]) => void;
  elements: cytoscape.ElementDefinition[];
  setElements: (elements: cytoscape.ElementDefinition[]) => void;
  runLayout: boolean;
  setRunLayout: (runLayout: boolean) => void;
  graphUpdateNumber: number;
  /** Trigger a graph update manually with update number */
  incrementGraphUpdateNumber: () => void;
};

export const useStoreGraph = create<StoreGraph>((set) => ({
  layout: undefined,
  setLayout: (layout) => set((state) => ({ ...state, layout })),
  elements: [],
  setElements: (elements) => set((state) => ({ ...state, elements })),
  runLayout: false,
  setRunLayout: (runLayout) => set((state) => ({ ...state, runLayout })),
  graphUpdateNumber: 0,
  incrementGraphUpdateNumber: () =>
    set((state) => ({
      ...state,
      graphUpdateNumber: state.graphUpdateNumber + 1,
    })),
}));
