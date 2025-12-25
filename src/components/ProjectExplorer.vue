<template>
  <div id="projectExplorer">
    <div class="head explorerHead">
      <div class="headLeft">
        <div class="explorerBrand">
          <span class="material-icons">grid_view</span>
          <span class="title">AdvancedGUI Community Editor</span>
        </div>
      </div>
      <div class="center">
        <div class="explorerTitle">
          {{ t("projectExplorer.title", "Project Explorer") }}
        </div>
      </div>
      <div class="headRight">
        <div class="langSwitch">
          <span class="label">{{ t("header.lang", "Language") }}</span>
          <span class="material-icons">translate</span>
          <div class="langSelect">
            <select :value="language" @change="onLanguageChange">
              <option
                v-for="opt in languages"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
            <span class="material-icons caret">expand_more</span>
          </div>
        </div>
      </div>
    </div>
    <div class="hero">
      <div class="heroText">
        <div class="brand">
          <div class="logoBadge">AG</div>
          <div class="brandText">
            <h1>AdvancedGUI Community Editor</h1>
            <p class="subtitle">
              {{
                t(
                  "projectExplorer.subtitle",
                  "A community-built GUI editor for Minecraft, made for creators",
                )
              }}
            </p>
          </div>
        </div>
        <p class="lead">
          {{
            t(
              "projectExplorer.lead",
              "Build menus without the hassle: drag elements, align them, and export when everything feels right.",
            )
          }}
        </p>
        <div class="heroActions">
          <div class="btn heroPrimary" @click="openNewProject">
            <span class="material-icons">add</span>
            <span class="text">{{
              t("projectExplorer.create", "Create new project")
            }}</span>
          </div>
          <div class="btn heroSecondary" @click="triggerFileSelector()">
            <span class="material-icons">upload</span>
            <span class="text">{{
              t("projectExplorer.import", "Import project")
            }}</span>
          </div>
        </div>
        <div class="heroStats">
          <div class="stat">
            <span class="value">{{ projects.length }}</span>
            <span class="label">{{
              t("projectExplorer.stats.projects", "Projects")
            }}</span>
          </div>
          <div class="stat">
            <span class="value">{{ summedSize.toFixed(2) }} MB</span>
            <span class="label">{{
              t("projectExplorer.stats.storage", "Storage used")
            }}</span>
          </div>
        </div>
      </div>
      <div class="heroPanel">
        <div class="panelTitle">
          {{ t("projectExplorer.tips.title", "Getting started") }}
        </div>
        <ul class="tipsList">
          <li>
            {{
              t(
                "projectExplorer.tips.one",
                "Create a project and set the canvas size in frames.",
              )
            }}
          </li>
          <li>
            {{
              t(
                "projectExplorer.tips.two",
                "Organize layers in the tree so the layout stays readable.",
              )
            }}
          </li>
          <li>
            {{
              t(
                "projectExplorer.tips.three",
                "Use snapping and alignment to keep everything neat.",
              )
            }}
          </li>
        </ul>
        <div class="panelFooter">
          <span class="material-icons">auto_awesome</span>
          <span>{{
            t(
              "projectExplorer.tips.note",
              "Everything stays local in your browser.",
            )
          }}</span>
        </div>
        <div class="panelDivider"></div>
        <div class="panelActions">
          <div class="panelAction" @click="openAbout">
            <span class="material-icons">info</span>
            <span>{{ t("projectExplorer.about", "About the editor") }}</span>
          </div>
          <div class="panelAction" @click="openDevMode">
            <span class="material-icons">code</span>
            <span>{{ t("projectExplorer.devMode", "Dev-Mode") }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="projectSection">
      <div class="sectionHeader">
        <h2>{{ t("projectExplorer.yourProjects", "Your projects") }}</h2>
        <div class="sectionActions">
          <div class="searchBox">
            <span class="material-icons">search</span>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('projectExplorer.search', 'Search projects')"
            />
          </div>
        </div>
      </div>
      <div class="projectList">
        <div v-if="projects.length > 0" class="card createNew" @click="openNewProject">
          <span class="material-icons">add</span>
          <span>{{ t("projectExplorer.create", "Create new project") }}</span>
        </div>
        <div
          v-for="project in filteredProjects"
          :key="project.name"
          class="card projectCard"
          @click="openProject(project)"
          :ref="`proj#${project.name}`"
        >
          <div class="cardHeader">
            <div v-if="project.version != VERSION" class="badge">
              {{ t("projectExplorer.needsUpdate", "Update") }}
            </div>
            <div
              class="more"
              @click.stop="openProjectMenu(project.name, $event)"
            >
              <span class="material-icons">expand_more</span>
            </div>
          </div>
          <div class="cardFooter">
            <div class="name">
              <h3>{{ project.name }}</h3>
              <span>{{
                ((JSON.stringify(project).length * 2) / 1000 / 1000).toFixed(
                  2,
                ) + " MB"
              }}</span>
            </div>
            <div class="openCta">
              <span class="material-icons">launch</span>
              <span>{{ t("projectExplorer.open", "OPEN") }}</span>
            </div>
          </div>

          <absolute-menu
            :entries="getActions(project)"
            :ref="`projMenu#${project.name}`"
          ></absolute-menu>
        </div>
      </div>
      <div v-if="projects.length === 0" class="emptyState">
        <span class="material-icons">search_off</span>
        <div class="emptyTitle">
          {{ t("projectExplorer.empty.firstTitle", "No projects yet") }}
        </div>
        <div class="emptyBody">
          {{ t("projectExplorer.empty.firstBody", "Start fresh by creating your first project.") }}
        </div>
        <div class="btn heroPrimary" @click="openNewProject">
          <span class="material-icons">add</span>
          <span class="text">{{
            t("projectExplorer.create", "Create new project")
          }}</span>
        </div>
      </div>
      <div v-else-if="filteredProjects.length === 0" class="emptyState">
        <span class="material-icons">search_off</span>
        <div class="emptyTitle">
          {{ t("projectExplorer.empty.title", "No projects found") }}
        </div>
        <div class="emptyBody">
          {{ t("projectExplorer.empty.body", "Try another name.") }}
        </div>
      </div>
    </div>

    <div class="absInfoBar">
      <!-- <div class="storage">
        <div>
          <span>{{ summedSize.toFixed(2) }} MB / 5.00 MB</span>
          <span
            class="material-icons"
            @click="
              info(
                'This is an approximation of your browser\'s restriction on how much a website is allowed to store.'
              )
            "
            >info</span
          >
        </div>
        <div
          class="remaining"
          :style="{ width: `${Math.max(100 - (100 / 5) * summedSize, 0)}%` }"
        ></div>
      </div> -->
    </div>

    <input
      type="file"
      ref="fileDownload"
      accept=".json"
      style="display: none"
      @change="checkForUpload()"
    />
    <teleport to="body">
      <modal
        :title="t('header.about.title', 'About the editor')"
        icon="help_outline"
        v-model="showAbout"
        closeBtn
      >
        <p>
          {{
            t(
              "header.about.body",
              `AdvancedGUI Community Editor is a community-built project for easier GUI editing in AdvancedGUI. AdvancedGUI is a game extension for the sandbox video game Minecraft. It is available for purchase on SpigotMC. The editor is open-source on GitHub. Current format-version: {version}.`,
            ).replace("{version}", formatVersion)
          }}
        </p>
      </modal>
      <modal
        :title="t('header.dev.title', 'Dev-Mode')"
        icon="code"
        v-model="showDevMode"
        closeBtn
      >
        <p>
          {{
            t(
              "header.dev.body",
              'Enable the tune icon near "General settings" to toggle dev-mode for advanced options like moving elements outside the view, editing IDs, previewing item-frame grid, and setting RGBA directly.',
            )
          }}
        </p>
        <ul>
          <li>
            {{ t("dev.move", "Move component partially outside the GUI view") }}
          </li>
          <li>{{ t("dev.id", "Change the ID of components") }}</li>
          <li>
            {{
              t(
                "dev.preview",
                "Preview how the GUI will be divided into item-frames",
              )
            }}
          </li>
          <li>
            {{
              t(
                "dev.rgba",
                "Set the direct RGBA color value of components (useful for template variables)",
              )
            }}
          </li>
        </ul>
      </modal>
    </teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  deleteProject,
  exportProject,
  getThumbnail,
  importProject,
  openNewProject,
  openProject,
  projects,
} from "../utils/manager/ProjectManager";
import { VERSION } from "../utils/manager/UpdateManager";
import { info, loading } from "../utils/manager/WorkspaceManager";
import { Project } from "../utils/Project";
import { vueRef } from "../utils/VueRef";
import AbsoluteMenu from "./AbsoluteMenu.vue";
import Modal from "./Modal.vue";
import {
  availableLanguages,
  language,
  setLanguage,
  t,
  type Language,
} from "@/utils/i18n";

export default defineComponent({
  data() {
    return {
      projects: vueRef(projects),
      openNewProject,
      openProject,
      VERSION,
      formatVersion: VERSION,
      info,
      t,
      searchQuery: "",
      showAbout: false,
      showDevMode: false,
      language: vueRef(language),
      languages: availableLanguages.value,
    };
  },

  components: { AbsoluteMenu, Modal },

  computed: {
    summedSize(): number {
      return this.projects
        .map((p) => (JSON.stringify(p).length * 2) / 1000 / 1000)
        .reduce((i, j) => i + j, 0);
    },

    filteredProjects(): Project[] {
      const query = this.searchQuery.trim().toLowerCase();
      if (!query) return this.projects;
      return this.projects.filter((project) =>
        project.name.toLowerCase().includes(query),
      );
    },
  },

  watch: {
    projects: {
      handler() {
        setTimeout(() => {
          this.projects.forEach(async (project) => {
            const elem = this.$refs[`proj#${project.name}`] as HTMLElement;
            if (elem)
              elem.style.backgroundImage = `url(${await getThumbnail(
                project.name,
              )})`;
          });
        }, 30);
      },
      immediate: true,
      deep: true,
    },
  },

  methods: {
    triggerFileSelector() {
      (this.$refs.fileDownload as HTMLElement).click();
    },

    async checkForUpload() {
      const selector = this.$refs.fileDownload as HTMLInputElement;

      if (selector.files?.length) {
        const file = selector.files[0];
        loading(true);

        const project = JSON.parse(await file.text()) as Project;
        await importProject(project);

        loading(false);
      }
    },

    getActions(project: Project) {
      const actions = [
        {
          icon: "download",
          name: t("projectExplorer.download", "Download"),
          action: () => exportProject(project.name),
        },
        {
          icon: "delete",
          name: t("projectExplorer.delete", "Delete"),
          action: () => deleteProject(project.name),
        },
      ];

      if (project.version != VERSION) {
        actions.splice(0, 0, {
          icon: "update",
          name: t("projectExplorer.openToUpdate", "Open to update"),
          action: () => {
            openProject(project);
          },
        });
      }

      return actions;
    },

    onLanguageChange(event: Event) {
      const target = event.target as HTMLSelectElement;
      setLanguage(target.value as Language);
    },

    openAbout() {
      this.showAbout = true;
    },

    openDevMode() {
      this.showDevMode = true;
    },

    openProjectMenu(projectName: string, ev: MouseEvent) {
      const refName = `projMenu#${projectName}`;
      const menuRef = this.$refs[refName] as
        | { open?: (x: number, y: number) => void }
        | { open?: (x: number, y: number) => void }[]
        | undefined;
      const menu = Array.isArray(menuRef) ? menuRef[0] : menuRef;
      if (!menu?.open) return;
      menu.open(ev.clientX, ev.clientY);
    },
  },
});
</script>

<style lang="scss">
#projectExplorer {
  min-height: 100vh;
  width: 100%;
  color: $light;
  padding: 0 0 var(--layout-gap);
  box-sizing: border-box;
  position: relative;
  overflow-x: hidden;
  --page-pad: var(--layout-gap);

  &::before {
    content: "";
    position: fixed;
    inset: 0;
    background-image:
      radial-gradient(rgba(76, 195, 255, 0.08) 1px, transparent 0),
      linear-gradient(
        180deg,
        rgba(15, 20, 28, 0.75) 0%,
        rgba(15, 20, 28, 0.15) 60%,
        rgba(15, 20, 28, 0.9) 100%
      );
    background-size:
      36px 36px,
      cover;
    opacity: 0.35;
    pointer-events: none;
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }

  .head.explorerHead,
  .hero,
  .projectSection {
    width: min(1240px, calc(100% - var(--page-pad) * 2));
    margin-left: auto;
    margin-right: auto;
  }

  .head.explorerHead {
    margin: var(--layout-gap) auto calc(var(--layout-gap) * 2);
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(240px, 0.85fr);
    gap: clamp(20px, 4vw, 48px);
    align-items: stretch;
    margin-bottom: clamp(24px, 5vw, 56px);
  }
  .explorerHead {
    .headLeft,
    .headRight,
    .center {
      gap: 10px;
    }

    .explorerBrand {
      display: flex;
      align-items: center;
      gap: 8px;
      color: $light2;
      font-weight: 600;
      letter-spacing: 0.4px;

      .material-icons {
        font-size: 18px;
        color: $light3;
      }
    }

    .explorerTitle {
      font-size: 0.95rem;
      color: $light3;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

  }

  .langSwitch {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 12px;
    border: 1px solid rgba(138, 148, 163, 0.2);
    background: rgba(15, 20, 28, 0.6);

    .label {
      text-transform: none;
      font-size: 12px;
      color: $light3;
    }

    .material-icons {
      font-size: 18px;
      color: $light3;
    }

    .langSelect {
      position: relative;
      display: flex;
      align-items: center;

      select {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        background: transparent;
        color: $light;
        border: none;
        padding: 4px 22px 4px 6px;
        font-size: 13px;

        &:focus {
          outline: none;
        }
      }

      .caret {
        position: absolute;
        right: 4px;
        font-size: 18px;
        color: $light4;
        pointer-events: none;
      }
    }
  }

  .heroText {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .logoBadge {
    height: 56px;
    width: 56px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      140deg,
      rgba(76, 195, 255, 0.7),
      rgba(56, 217, 126, 0.7)
    );
    color: #0f141c;
    font-family: "Nunito", sans-serif;
    font-weight: 700;
    letter-spacing: 0.4px;
  }

  .brandText {
    h1 {
      margin: 0;
      font-size: clamp(2.3rem, 4vw, 3.3rem);
      font-weight: 700;
      font-family: "Nunito", sans-serif;
      letter-spacing: 0.3px;
    }

    .subtitle {
      margin: 6px 0 0;
      font-size: 0.95rem;
      color: $light3;
    }
  }

  .lead {
    margin: 0;
    color: $light2;
    font-size: 1rem;
    max-width: 540px;
    line-height: 1.6;
  }

  .heroActions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .heroPrimary {
    background: linear-gradient(
      140deg,
      rgba(76, 195, 255, 0.35),
      rgba(56, 217, 126, 0.25)
    );
    border-color: rgba(76, 195, 255, 0.5);
    color: $light;

    .material-icons {
      color: $light;
    }
  }

  .heroSecondary {
    background: rgba(15, 20, 28, 0.45);
    border-color: rgba(138, 148, 163, 0.4);
    color: $light2;
  }


  .heroStats {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
  }

  .stat {
    background: rgba(20, 26, 35, 0.75);
    border: 1px solid rgba(138, 148, 163, 0.2);
    border-radius: 12px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    min-width: 140px;

    .value {
      font-size: 1.15rem;
      font-weight: 700;
      color: $light;
    }

    .label {
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: $light4;
    }
  }

  .heroPanel {
    background: linear-gradient(
      165deg,
      rgba(26, 33, 43, 0.95),
      rgba(15, 20, 28, 0.95)
    );
    border: 1px solid rgba(138, 148, 163, 0.25);
    border-radius: 18px;
    padding: 18px 20px;
    box-shadow: $shadowStrong;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .panelTitle {
    font-size: 0.85rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: $light3;
  }

  .tipsList {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;

    li {
      display: flex;
      gap: 8px;
      color: $light2;
      font-size: 0.95rem;
      line-height: 1.5;

      &::before {
        content: "•";
        color: $blue;
        margin-top: 1px;
      }
    }
  }

  .panelFooter {
    display: flex;
    align-items: center;
    gap: 8px;
    color: $light3;
    font-size: 0.85rem;

    .material-icons {
      font-size: 18px;
    }
  }

  .panelDivider {
    height: 1px;
    background: rgba(138, 148, 163, 0.2);
    margin: 2px 0;
  }

  .panelActions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .panelAction {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid rgba(138, 148, 163, 0.2);
    background: rgba(15, 20, 28, 0.6);
    color: $light2;
    cursor: pointer;
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      box-shadow 120ms ease,
      transform 120ms ease;

    .material-icons {
      font-size: 18px;
      color: $light3;
    }

    &:hover {
      background: rgba(26, 33, 43, 0.8);
      border-color: rgba(138, 148, 163, 0.35);
      box-shadow: $shadow;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }

  .projectSection {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .sectionHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;

    h2 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 600;
    }
  }

  .sectionActions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .searchBox {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(20, 26, 35, 0.8);
    border: 1px solid rgba(138, 148, 163, 0.25);
    border-radius: 12px;
    padding: 8px 12px;
    min-width: 220px;

    .material-icons {
      font-size: 18px;
      color: $light4;
    }

    input {
      background: transparent;
      border: none;
      color: $light;
      font-size: 0.9rem;
      width: 180px;

      &:focus {
        outline: none;
      }

      &::placeholder {
        color: $light4;
      }
    }
  }

  .projectList {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 18px;

    .card {
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      border: 1px solid rgba(138, 148, 163, 0.2);
      box-shadow: $shadow;
      background-color: rgba(20, 26, 35, 0.8);
      background-size: cover;
      background-position: center;
      min-height: 180px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      transition:
        transform 180ms ease,
        box-shadow 180ms ease,
        border-color 180ms ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: $shadowStrong;
        border-color: rgba(76, 195, 255, 0.4);
      }
    }

    .createNew {
      background: linear-gradient(
        150deg,
        rgba(56, 217, 126, 0.1),
        rgba(76, 195, 255, 0.08)
      );
      border: 1px dashed rgba(56, 217, 126, 0.55);
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: $light2;
      text-align: center;

      .material-icons {
        font-size: 2.4rem;
        color: $green;
      }
    }

    .projectCard {
      &::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
          180deg,
          rgba(15, 20, 28, 0.1) 0%,
          rgba(15, 20, 28, 0.55) 60%,
          rgba(15, 20, 28, 0.92) 100%
        );
        opacity: 0.95;
        pointer-events: none;
      }

      .cardHeader {
        position: relative;
        z-index: 1;
        padding: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .badge {
        background: rgba(76, 195, 255, 0.18);
        border: 1px solid rgba(76, 195, 255, 0.55);
        color: $light;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 0.65rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .more {
        position: relative;
        z-index: 2;
        height: 30px;
        width: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 9px;
        border: 1px solid rgba(138, 148, 163, 0.3);
        background: rgba(15, 20, 28, 0.55);
        cursor: pointer;

        .material-icons {
          font-size: 18px;
        }

        &:hover {
          background: rgba(15, 20, 28, 0.8);
        }
      }

      .cardFooter {
        position: relative;
        z-index: 1;
        margin-top: auto;
        padding: 12px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 10px;
      }

      .name {
        flex: 1;
        min-width: 0;

        h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        span {
          font-size: 0.8rem;
          color: $light3;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .openCta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: 12px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(76, 195, 255, 0.45);
        background: rgba(76, 195, 255, 0.14);
        color: $light;
        font-size: 0.7rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        opacity: 0.85;
        flex-shrink: 0;
        transition:
          opacity 150ms ease,
          transform 150ms ease;

        .material-icons {
          font-size: 16px;
        }
      }

      &:hover .openCta {
        opacity: 1;
        transform: translateY(-1px);
      }
    }
  }

  .emptyState {
    margin-top: 12px;
    border-radius: 18px;
    border: 1px dashed rgba(138, 148, 163, 0.4);
    background: rgba(15, 20, 28, 0.6);
    padding: 32px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;

    .material-icons {
      font-size: 32px;
      color: $light3;
    }

    .emptyTitle {
      font-size: 1.1rem;
      font-weight: 600;
    }

    .emptyBody {
      color: $light3;
      max-width: 380px;
    }
  }

  .absInfoBar {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
  }

  @media screen and (max-width: 980px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .heroPanel {
      order: 2;
    }

    .heroText {
      order: 1;
    }
  }

  @media screen and (max-width: 640px) {
    --page-pad: 24px;

    .explorerHead {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }

    .sectionHeader {
      align-items: flex-start;
    }

    .searchBox {
      width: 100%;
    }

    .projectList {
      grid-template-columns: 1fr;
    }
  }
}
</style>
