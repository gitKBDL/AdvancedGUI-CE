import { reactive } from "vue";

export interface GeneralSettings {
  width: number;
  height: number;
  zoom: number;
  snapEnabled: boolean;
  projectName: string;
  /**
   * Optional layout-level metadata group. Exported as `metadataGroup`; the
   * plugin shares local metadata between all layouts with the same group name
   * (Layout.metadataGroupName falls back to the layout name when absent).
   * Empty string == not set (field omitted from the export).
   */
  metadataGroup: string;
  textVerticalPixelCrop: boolean;
  textHorizontalPixelAlign: boolean;
}

export const settings = reactive({
  width: 3,
  height: 2,
  zoom: 2,
  snapEnabled: true,
  projectName: "Starter",
  metadataGroup: "",
  textVerticalPixelCrop: true,
  textHorizontalPixelAlign: false,
} as GeneralSettings);
