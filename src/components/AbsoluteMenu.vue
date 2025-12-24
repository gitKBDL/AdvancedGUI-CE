<template>
  <teleport to="body">
    <div class="absoluteMenu" ref="menu">
      <div v-for="(entry, index) in entries" :key="index">
        <div class="divider" v-if="index != 0"></div>
        <div class="entry" @click.stop="entry.action">
          <span class="material-icons">{{ entry.icon }}</span>
          {{ entry.name }}
        </div>
      </div>
    </div>
  </teleport>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    entries: {
      type: Array as () => {
        name: string;
        icon: string;
        action: VoidFunction;
      }[],
      required: true,
    },
  },

  mounted() {
    document.addEventListener("click", this.checkClose, { capture: true });
  },

  unmounted() {
    document.removeEventListener("click", this.checkClose, { capture: true });
  },

  data() {
    return {};
  },

  methods: {
    checkClose(ev: MouseEvent) {
      const menuComp = this.$refs.menu as HTMLElement;
      const target = ev.target as Node;
      if (menuComp.contains(target)) return;
      menuComp.style.display = "none";
    },

    open(x: number, y: number) {
      const menu = this.$refs.menu as HTMLElement;
      menu.style.display = "block";
      menu.style.opacity = "0";
      menu.style.visibility = "hidden";
      menu.style.pointerEvents = "none";

      const edgePadding = 8;
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;

      let posX = x;
      let posY = y;

      if (posX + menuWidth > window.innerWidth) {
        posX = window.innerWidth - menuWidth - edgePadding;
      }

      if (posX < edgePadding) posX = edgePadding;

      if (posY + menuHeight > window.innerHeight) {
        posY = y - menuHeight - edgePadding;
      }

      if (posY < edgePadding) posY = edgePadding;

      if (posY + menuHeight > window.innerHeight) {
        posY = window.innerHeight - menuHeight - edgePadding;
      }

      menu.style.top = `${posY}px`;
      menu.style.left = `${posX}px`;
      menu.style.visibility = "visible";

      requestAnimationFrame(() => {
        menu.style.opacity = "1";
        menu.style.pointerEvents = "auto";
      });
    },
  },
});
</script>

<style lang="scss" scoped></style>
