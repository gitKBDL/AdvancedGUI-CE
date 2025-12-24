import { reactive } from "vue";

export interface GeneralSettings {
  width: number;
  height: number;
  zoom: number;
  snapEnabled: boolean;
  projectName: string;
}

export const settings = reactive({
  width: 3,
  height: 2,
  zoom: 2,
  snapEnabled: true,
  projectName: "Starter",
} as GeneralSettings);
