<template>
  <div
    id="canvasPadding"
    @mousedown.prevent="onClickDown"
    @mouseup="onClickUp"
    @mousemove="onMove"
    @mouseleave="onClickUp"
  >
    <canvas ref="canvas" id="canvas" :width="width" :height="height"></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Point } from "@/utils/Point";
import { ResizeIcon, Modifier, moveModifier } from "@/utils/Modifier";
import { Component } from "@/utils/components/Component";
import {
  isInvisible,
  invisibleIDs,
  components as registeredComponents,
  isComponentLocked,
  traverseComponent,
  getParentComponent,
} from "@/utils/manager/ComponentManager";
import { drawSelection, getHanderAt } from "@/utils/Selection";
import { BoundingBox } from "@/utils/BoundingBox";
import { images, regImages } from "@/utils/manager/ImageManager";
import { ListItemGroup } from "../utils/ListItem";
import { settings } from "../utils/manager/SettingsManager";
import {
  componentTree,
  devMode,
  pauseRendering,
  selection,
  updateSelection,
} from "../utils/manager/WorkspaceManager";
import { unsavedChange, updateHistory } from "../utils/manager/HistoryManager";
import { vueRef } from "../utils/VueRef";
import { updateCurrentThumbnail } from "../utils/manager/ProjectManager";

let redrawFunction: (() => void) | null = null;

export function requestRedraw() {
  if (redrawFunction) redrawFunction();
}

type SpacingGuide = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  axis: "x" | "y";
};

type SpacingGuideX = { dist: number; lineY: number; edgeX: number };
type SpacingGuideY = { dist: number; lineX: number; edgeY: number };
type SpacingCandidates = {
  left: SpacingGuideX | null;
  right: SpacingGuideX | null;
  top: SpacingGuideY | null;
  bottom: SpacingGuideY | null;
};

export default defineComponent({
  data() {
    return {
      mouseDownTime: Date.now(),

      modifying: null as null | {
        modifier: Modifier;
        icon: ResizeIcon | "move";
        startPosition: Point;
        elementStartPosition: BoundingBox;
        singleAxis: boolean;
        component: Component;
        duplicateOnMove: boolean;
        duplicated: boolean;
        hasModified: boolean;
      },

      invisibleIDs: vueRef(invisibleIDs),
      selection: vueRef(selection),
      unsavedChange: vueRef(unsavedChange),
      settings,
      componentTree: vueRef(componentTree),
      registeredComponents,
      images,
      regImages,
      pauseRendering: vueRef(pauseRendering),

      devMode: vueRef(devMode),
      lastMove: Date.now(),
      lastSnap: Date.now() - 1000 * 12,
      snapGuides: {
        x: [] as number[],
        y: [] as number[],
      },
      spacingGuides: [] as SpacingGuide[],
    };
  },

  mounted() {
    this.adjustHeight();

    redrawFunction = this.redraw;

    const canvas = (this.$refs.canvas as HTMLCanvasElement).getContext(
      "2d",
    ) as CanvasRenderingContext2D;

    canvas.imageSmoothingEnabled = false;

    this.redraw();
  },

  unmounted() {
    redrawFunction = null;
  },

  computed: {
    height(): number {
      return this.settings.height * 128;
    },

    width(): number {
      return this.settings.width * 128;
    },
  },

  watch: {
    unsavedChange() {
      this.lastSnap = 0;
      this.redraw();
    },

    selection: {
      deep: true,
      handler() {
        this.redraw();
      },
    },

    componentTree: {
      deep: true,
      handler() {
        this.redraw();
      },
    },

    regImages: {
      deep: true,
      handler() {
        this.redraw();
      },
    },

    "settings.zoom"() {
      this.adjustHeight();
    },

    "settings.height"() {
      this.adjustHeight();
      setTimeout(this.redraw, 10);
    },

    "settings.width"() {
      setTimeout(this.redraw, 10);
    },
    "settings.snapEnabled"() {
      if (!this.settings.snapEnabled) {
        this.snapGuides.x = [];
        this.snapGuides.y = [];
      }
    },

    registeredComponents() {
      if (
        this.selection?.component &&
        !this.registeredComponents[this.selection?.component.id]
      )
        updateSelection({ value: null });

      this.redraw();
    },

    invisibleIDs: {
      deep: true,
      handler() {
        this.redraw();
      },
    },

    pauseRendering() {
      this.redraw();
    },

    devMode: {
      handler() {
        this.redraw();
      },
    },
  },

  methods: {
    adjustHeight() {
      (this.$refs.canvas as HTMLElement).style.height = `${
        this.height * this.settings.zoom
      }px`;
    },

    redraw() {
      if (this.pauseRendering) return;

      const canvas = (this.$refs.canvas as HTMLCanvasElement).getContext("2d", {
        alpha: false,
      }) as CanvasRenderingContext2D;

      canvas.clearRect(0, 0, this.width, this.height);

      for (let i = this.componentTree.length - 1; i >= 0; i--) {
        const element = this.componentTree[i];
        if (!isInvisible(element.id)) element.draw(canvas);
      }

      if (Date.now() - this.lastSnap > 1000 * 15) {
        try {
          updateCurrentThumbnail(
            (this.$refs.canvas as HTMLCanvasElement).toDataURL(),
          );
        } catch {
          // Remote images without CORS can taint the canvas, skip thumbnails.
        }

        this.lastSnap = Date.now();
      }

      if (
        this.selection?.component &&
        this.registeredComponents[this.selection?.component.id]
      )
        drawSelection(canvas, this.selection?.component);

      if (this.snapGuides.x.length || this.snapGuides.y.length) {
        canvas.save();
        canvas.strokeStyle = "rgba(76, 195, 255, 0.7)";
        canvas.lineWidth = 1;
        canvas.setLineDash([4, 6]);

        this.snapGuides.x.forEach((lineX) => {
          const x = Math.round(lineX) + 0.5;
          canvas.beginPath();
          canvas.moveTo(x, 0);
          canvas.lineTo(x, this.height);
          canvas.stroke();
        });

        this.snapGuides.y.forEach((lineY) => {
          const y = Math.round(lineY) + 0.5;
          canvas.beginPath();
          canvas.moveTo(0, y);
          canvas.lineTo(this.width, y);
          canvas.stroke();
        });

        canvas.restore();
      }

      if (this.spacingGuides.length) {
        canvas.save();
        canvas.strokeStyle = "rgba(255, 192, 92, 0.85)";
        canvas.fillStyle = "rgba(255, 192, 92, 0.95)";
        canvas.lineWidth = 1;
        canvas.setLineDash([2, 4]);
        canvas.font = "12px VT323, monospace";
        canvas.textAlign = "center";
        canvas.textBaseline = "middle";

        const tick = 4;

        this.spacingGuides.forEach((guide) => {
          canvas.beginPath();
          canvas.moveTo(guide.x1, guide.y1);
          canvas.lineTo(guide.x2, guide.y2);
          canvas.stroke();

          if (guide.axis === "x") {
            canvas.beginPath();
            canvas.moveTo(guide.x1, guide.y1 - tick);
            canvas.lineTo(guide.x1, guide.y1 + tick);
            canvas.moveTo(guide.x2, guide.y2 - tick);
            canvas.lineTo(guide.x2, guide.y2 + tick);
            canvas.stroke();
          } else {
            canvas.beginPath();
            canvas.moveTo(guide.x1 - tick, guide.y1);
            canvas.lineTo(guide.x1 + tick, guide.y1);
            canvas.moveTo(guide.x2 - tick, guide.y2);
            canvas.lineTo(guide.x2 + tick, guide.y2);
            canvas.stroke();
          }

          const midX = (guide.x1 + guide.x2) / 2;
          const midY = (guide.y1 + guide.y2) / 2;
          const label = `${guide.label}px`;
          const width = canvas.measureText(label).width;
          const padding = 4;
          const boxHeight = 14;

          canvas.fillStyle = "rgba(20, 26, 35, 0.85)";
          canvas.fillRect(
            midX - width / 2 - padding,
            midY - boxHeight / 2,
            width + padding * 2,
            boxHeight,
          );

          canvas.fillStyle = "rgba(255, 192, 92, 0.95)";
          canvas.fillText(label, midX, midY);
        });

        canvas.restore();
      }

      if (this.devMode) {
        canvas.strokeStyle = "rgba(255,255,255,0.3)";
        canvas.setLineDash([]);
        canvas.lineWidth = 1;
        canvas.beginPath();
        for (let lineX = 128; lineX < this.width; lineX += 128) {
          canvas.moveTo(lineX - 0.5, 0);
          canvas.lineTo(lineX - 0.5, this.height);
        }
        for (let lineY = 128; lineY < this.height; lineY += 128) {
          canvas.moveTo(0, lineY - 0.5);
          canvas.lineTo(this.width, lineY - 0.5);
        }
        canvas.stroke();
      }
    },

    getLowestCommonParents(
      comp: Component,
      targetId: string,
      point: Point,
    ): (ListItemGroup<Component> & Component) | undefined {
      if (comp.isGroup()) {
        if (comp.getItems().some((c) => c.id == targetId)) return comp;
        else
          return comp
            .getItems()
            .filter((c) => c.getBoundingBox().isInside(point))
            .map((c) => this.getLowestCommonParents(c, targetId, point))
            .find((c) => !!c);
      }

      return undefined;
    },

    getParentList(component: Component): Component[] | undefined {
      if (componentTree.value.some((c) => c.id == component.id)) {
        return componentTree.value;
      }
      return getParentComponent(component)?.getItems();
    },

    duplicateComponentForMove(component: Component): Component | null {
      const parent = this.getParentList(component);
      if (!parent) return null;

      const index = parent.findIndex((c) => c.id == component.id);
      const duplicate = component.duplicate() as Component | null;
      if (!duplicate) return null;

      parent.splice(index === -1 ? 0 : index, 0, duplicate);
      updateSelection({ value: duplicate });
      return duplicate;
    },

    markMouseDownOnCurrentSelection(point: Point) {
      if (
        this.selection?.component &&
        this.selection.component.getBoundingBox().isInside(point)
      ) {
        this.mouseDownTime = Date.now();
      }
    },

    resolveHoveredSelection(point: Point, hovered: Component): Component {
      if (!this.selection?.component) return hovered;

      const commonParent = this.getLowestCommonParents(
        hovered,
        this.selection.component.id,
        point,
      );
      const sibling = commonParent
        ?.getItems()
        ?.find((c) => c.getBoundingBox().isInside(point));

      if (sibling) return sibling;
      if (commonParent) return commonParent;
      return hovered;
    },

    updateSelectionOnMouseDown(point: Point, hovered: Component | undefined) {
      if (!hovered) {
        updateSelection({ value: null });
        return undefined;
      }

      const currentSelection = this.selection?.component;
      if (currentSelection && currentSelection.getBoundingBox().isInside(point)) {
        return hovered;
      }

      const nextSelection = this.resolveHoveredSelection(point, hovered);
      updateSelection({ value: nextSelection });
      return nextSelection;
    },

    resolveModifierSetup(
      point: Point,
      selectedComponent: Component,
      handler: ReturnType<typeof getHanderAt>,
    ) {
      let modifier: Modifier | undefined;
      let icon: ResizeIcon | "move" | undefined = "move";
      let singleAxis = false;

      if (handler) {
        modifier = handler.modifier;
        icon = handler.icon;
        singleAxis = handler.singleAxisAction;
      } else if (selectedComponent.getBoundingBox().isInside(point)) {
        this.setCursor("move");
        modifier = moveModifier;
      }

      if (!modifier || icon === undefined) return null;
      return { modifier, icon, singleAxis };
    },

    startModification(
      event: MouseEvent,
      point: Point,
      handler: ReturnType<typeof getHanderAt>,
    ) {
      const selectedComponent = this.selection?.component;
      if (!selectedComponent) return;
      if (isComponentLocked(selectedComponent)) return;

      const setup = this.resolveModifierSetup(point, selectedComponent, handler);
      if (!setup) return;

      this.modifying = {
        startPosition: point,
        icon: setup.icon,
        elementStartPosition: selectedComponent.getBoundingBox(),
        modifier: setup.modifier,
        singleAxis: setup.singleAxis,
        component: selectedComponent,
        duplicateOnMove: event.altKey,
        duplicated: false,
        hasModified: false,
      };

      if (setup.icon !== "move") {
        this.modifying.component.startResize(this.modifying.elementStartPosition);
      }
    },

    onClickDown(event: MouseEvent) {
      this.clearGuides();
      const point = this.getCursorPosition(event);
      const handler = getHanderAt(point);
      const hovered = this.getElementAt(point);

      if (!handler) {
        this.markMouseDownOnCurrentSelection(point);
        this.updateSelectionOnMouseDown(point, hovered);
      }

      this.startModification(event, point, handler);
      this.redraw();
    },

    onClickUp(event: MouseEvent) {
      this.clearGuides();
      const point = this.getCursorPosition(event);
      const hovered = this.getElementAt(point);

      if (Date.now() - this.mouseDownTime < 200) {
        if (this.selection?.component) {
          if (
            hovered &&
            this.containsComponentAtPoint(
              hovered,
              this.selection?.component,
              point,
            )
          )
            updateSelection({
              value: this.selection?.component.refineSelection(point),
            });
          else updateSelection({ value: hovered! });
        }
      }

      this.redraw();
      const shouldUpdateHistory = this.modifying?.hasModified;
      if (shouldUpdateHistory) updateHistory();

      if (this.modifying) {
        this.modifying.component.endResize();
      }

      this.modifying = null;
    },

    getElementAt(point: Point) {
      return this.componentTree.find((element) =>
        element.getBoundingBox().isInside(point),
      );
    },

    containsComponentAtPoint(
      comp: Component,
      find: Component,
      point: Point,
    ): boolean {
      let lastFound = comp;

      do {
        if (lastFound == find) return true;
        comp = lastFound;
        lastFound = comp.refineSelection(point);
      } while (lastFound != comp);

      return lastFound == find;
    },

    setCursor(style: "move" | "default" | "pointer" | "move" | ResizeIcon) {
      (this.$refs.canvas as HTMLElement).style.cursor = style;
    },

    shouldThrottleMove() {
      return !!(this.modifying && Date.now() <= this.lastMove + 20);
    },

    getModifiedBounds(point: Point) {
      const currentModifier = this.modifying!;
      const xOff = point.x - currentModifier.startPosition.x;
      const yOff = point.y - currentModifier.startPosition.y;
      return currentModifier.modifier(
        new Point(xOff, yOff),
        currentModifier.elementStartPosition,
      );
    },

    tryDuplicateWhileMoving(event: MouseEvent) {
      if (!this.modifying) return;
      if (!this.modifying.duplicateOnMove || this.modifying.duplicated) return;
      if (!event.altKey) return;

      const duplicate = this.duplicateComponentForMove(this.modifying.component);
      if (!duplicate) return;

      this.modifying.component = duplicate;
      this.modifying.elementStartPosition = duplicate.getBoundingBox();
      this.modifying.duplicated = true;
    },

    applyMoveBehavior(event: MouseEvent, bounds: BoundingBox) {
      this.tryDuplicateWhileMoving(event);
      if (!this.modifying) return bounds;

      const nextBounds = this.applySnapping(bounds, this.modifying.component);
      nextBounds.ensureBounds(this.width, this.height);
      this.updateSpacingGuides(nextBounds, this.modifying.component);
      return nextBounds;
    },

    markAsModifiedIfNeeded(newBounds: BoundingBox) {
      if (!this.modifying || this.modifying.hasModified) return;

      const start = this.modifying.elementStartPosition;
      if (
        newBounds.x !== start.x ||
        newBounds.y !== start.y ||
        newBounds.width !== start.width ||
        newBounds.height !== start.height
      ) {
        this.modifying.hasModified = true;
      }
    },

    handleActiveMove(event: MouseEvent, point: Point) {
      if (!this.modifying) return;
      if (isComponentLocked(this.modifying.component)) {
        this.setCursor("default");
        return;
      }

      this.setCursor(this.modifying.icon);
      let newBounds = this.getModifiedBounds(point);

      if (this.modifying.icon === "move") {
        newBounds = this.applyMoveBehavior(event, newBounds);
      } else {
        this.clearGuides();
        newBounds.ensureBounds(this.width, this.height);
      }

      this.markAsModifiedIfNeeded(newBounds);
      this.modifying.component.modify(newBounds, this.modifying.singleAxis);
    },

    shouldUseResizeCursor(handler: ReturnType<typeof getHanderAt>) {
      return (
        !!handler &&
        !!this.selection?.component &&
        !isComponentLocked(this.selection.component)
      );
    },

    shouldUseMoveCursor(point: Point, hovered: Component) {
      return (
        hovered == this.selection?.component ||
        !!this.selection?.component?.getBoundingBox().isInside(point)
      );
    },

    handleHoverMove(point: Point, hovered: Component | undefined) {
      this.clearGuides();
      const handler = getHanderAt(point);

      if (this.shouldUseResizeCursor(handler)) {
        this.setCursor(handler!.icon);
        return;
      }

      if (!hovered) {
        this.setCursor("default");
        return;
      }

      if (this.shouldUseMoveCursor(point, hovered)) {
        this.setCursor(
          this.selection?.component && isComponentLocked(this.selection.component)
            ? "default"
            : "move",
        );
        return;
      }

      this.setCursor("pointer");
    },

    onMove(event: MouseEvent) {
      if (this.shouldThrottleMove()) return;

      this.lastMove = Date.now();
      const point = this.getCursorPosition(event);
      const hovered = this.getElementAt(point);

      if (this.modifying) {
        this.handleActiveMove(event, point);
      } else {
        this.handleHoverMove(point, hovered);
      }
    },

    clearGuides() {
      this.clearSnapGuides();
      if (this.spacingGuides.length) {
        this.spacingGuides = [];
      }
    },

    clearSnapGuides() {
      if (this.snapGuides.x.length || this.snapGuides.y.length) {
        this.snapGuides.x = [];
        this.snapGuides.y = [];
      }
    },

    collectSnapTargets(exclude: Component) {
      const xTargets = new Set<number>();
      const yTargets = new Set<number>();
      const gridSize = 128;

      xTargets.add(0);
      xTargets.add(this.width / 2);
      xTargets.add(this.width);
      yTargets.add(0);
      yTargets.add(this.height / 2);
      yTargets.add(this.height);

      for (let x = 0; x <= this.width; x += gridSize) xTargets.add(x);
      for (let y = 0; y <= this.height; y += gridSize) yTargets.add(y);

      this.componentTree.forEach((root) =>
        traverseComponent(root, (comp) => {
          if (exclude.contains(comp.id)) return;
          if (isInvisible(comp.id)) return;
          const box = comp.getBoundingBox();
          if (box === BoundingBox.EMPTY) return;
          if (box.width <= 0 || box.height <= 0) return;

          xTargets.add(box.x);
          xTargets.add(box.x + box.width / 2);
          xTargets.add(box.x + box.width);

          yTargets.add(box.y);
          yTargets.add(box.y + box.height / 2);
          yTargets.add(box.y + box.height);
        }),
      );

      return {
        x: Array.from(xTargets),
        y: Array.from(yTargets),
      };
    },

    collectSpacingTargets(exclude: Component): BoundingBox[] {
      const boxes: BoundingBox[] = [];

      this.componentTree.forEach((root) =>
        traverseComponent(root, (comp) => {
          if (exclude.contains(comp.id)) return;
          if (isInvisible(comp.id)) return;
          const box = comp.getBoundingBox();
          if (box === BoundingBox.EMPTY) return;
          if (box.width <= 0 || box.height <= 0) return;
          boxes.push(box);
        }),
      );

      return boxes;
    },

    getSnapAnchors(start: number, size: number) {
      return [start, start + size / 2, start + size];
    },

    findClosestSnap(
      targets: number[],
      anchors: number[],
      threshold: number,
    ): { diff: number; line: number } | null {
      let snapped: { diff: number; line: number } | null = null;

      for (const line of targets) {
        for (const anchor of anchors) {
          const diff = line - anchor;
          const distance = Math.abs(diff);
          if (distance > threshold) continue;
          if (!snapped || distance < Math.abs(snapped.diff)) {
            snapped = { diff, line };
          }
        }
      }

      return snapped;
    },

    applySnapResult(
      value: number,
      snapped: { diff: number; line: number } | null,
    ) {
      if (!snapped) {
        return { value, guides: [] as number[] };
      }
      return {
        value: value + snapped.diff,
        guides: [snapped.line],
      };
    },

    applySnapping(bounds: BoundingBox, component: Component) {
      if (!this.settings.snapEnabled) {
        this.clearSnapGuides();
        return bounds;
      }

      const snapThreshold = 6;
      const { x: xTargets, y: yTargets } = this.collectSnapTargets(component);
      const snappedX = this.findClosestSnap(
        xTargets,
        this.getSnapAnchors(bounds.x, bounds.width),
        snapThreshold,
      );
      const snappedY = this.findClosestSnap(
        yTargets,
        this.getSnapAnchors(bounds.y, bounds.height),
        snapThreshold,
      );

      const snappedXResult = this.applySnapResult(bounds.x, snappedX);
      const snappedYResult = this.applySnapResult(bounds.y, snappedY);
      bounds.x = snappedXResult.value;
      bounds.y = snappedYResult.value;
      this.snapGuides.x = snappedXResult.guides;
      this.snapGuides.y = snappedYResult.guides;

      return bounds;
    },

    getAxisOverlap(startA: number, sizeA: number, startB: number, sizeB: number) {
      const start = Math.max(startA, startB);
      const end = Math.min(startA + sizeA, startB + sizeB);
      if (end <= start) return null;
      return {
        start,
        end,
        center: (start + end) / 2,
      };
    },

    isCloserCandidate(
      current: { dist: number } | null,
      next: { dist: number },
    ) {
      return !current || next.dist < current.dist;
    },

    updateHorizontalSpacingCandidates(
      bounds: BoundingBox,
      box: BoundingBox,
      candidates: SpacingCandidates,
    ) {
      const overlap = this.getAxisOverlap(bounds.y, bounds.height, box.y, box.height);
      if (!overlap) return;

      const lineY = overlap.center;
      if (box.x + box.width <= bounds.x) {
        const left: SpacingGuideX = {
          dist: bounds.x - (box.x + box.width),
          lineY,
          edgeX: box.x + box.width,
        };
        if (this.isCloserCandidate(candidates.left, left)) {
          candidates.left = left;
        }
      }

      if (box.x >= bounds.x + bounds.width) {
        const right: SpacingGuideX = {
          dist: box.x - (bounds.x + bounds.width),
          lineY,
          edgeX: box.x,
        };
        if (this.isCloserCandidate(candidates.right, right)) {
          candidates.right = right;
        }
      }
    },

    updateVerticalSpacingCandidates(
      bounds: BoundingBox,
      box: BoundingBox,
      candidates: SpacingCandidates,
    ) {
      const overlap = this.getAxisOverlap(bounds.x, bounds.width, box.x, box.width);
      if (!overlap) return;

      const lineX = overlap.center;
      if (box.y + box.height <= bounds.y) {
        const top: SpacingGuideY = {
          dist: bounds.y - (box.y + box.height),
          lineX,
          edgeY: box.y + box.height,
        };
        if (this.isCloserCandidate(candidates.top, top)) {
          candidates.top = top;
        }
      }

      if (box.y >= bounds.y + bounds.height) {
        const bottom: SpacingGuideY = {
          dist: box.y - (bounds.y + bounds.height),
          lineX,
          edgeY: box.y,
        };
        if (this.isCloserCandidate(candidates.bottom, bottom)) {
          candidates.bottom = bottom;
        }
      }
    },

    createHorizontalGuide(
      bounds: BoundingBox,
      guide: SpacingGuideX,
      direction: "left" | "right",
    ): SpacingGuide {
      if (direction === "left") {
        return {
          x1: guide.edgeX,
          y1: guide.lineY,
          x2: bounds.x,
          y2: guide.lineY,
          label: Math.round(guide.dist).toString(),
          axis: "x",
        };
      }

      return {
        x1: bounds.x + bounds.width,
        y1: guide.lineY,
        x2: guide.edgeX,
        y2: guide.lineY,
        label: Math.round(guide.dist).toString(),
        axis: "x",
      };
    },

    createVerticalGuide(
      bounds: BoundingBox,
      guide: SpacingGuideY,
      direction: "top" | "bottom",
    ): SpacingGuide {
      if (direction === "top") {
        return {
          x1: guide.lineX,
          y1: guide.edgeY,
          x2: guide.lineX,
          y2: bounds.y,
          label: Math.round(guide.dist).toString(),
          axis: "y",
        };
      }

      return {
        x1: guide.lineX,
        y1: bounds.y + bounds.height,
        x2: guide.lineX,
        y2: guide.edgeY,
        label: Math.round(guide.dist).toString(),
        axis: "y",
      };
    },

    buildSpacingGuides(bounds: BoundingBox, candidates: SpacingCandidates) {
      const guides: SpacingGuide[] = [];

      if (candidates.left && candidates.left.dist > 0) {
        guides.push(this.createHorizontalGuide(bounds, candidates.left, "left"));
      }
      if (candidates.right && candidates.right.dist > 0) {
        guides.push(this.createHorizontalGuide(bounds, candidates.right, "right"));
      }
      if (candidates.top && candidates.top.dist > 0) {
        guides.push(this.createVerticalGuide(bounds, candidates.top, "top"));
      }
      if (candidates.bottom && candidates.bottom.dist > 0) {
        guides.push(this.createVerticalGuide(bounds, candidates.bottom, "bottom"));
      }

      return guides;
    },

    updateSpacingGuides(bounds: BoundingBox, component: Component) {
      const candidates: SpacingCandidates = {
        left: null,
        right: null,
        top: null,
        bottom: null,
      };

      for (const box of this.collectSpacingTargets(component)) {
        this.updateHorizontalSpacingCandidates(bounds, box, candidates);
        this.updateVerticalSpacingCandidates(bounds, box, candidates);
      }

      this.spacingGuides = this.buildSpacingGuides(bounds, candidates);
    },

    getCursorPosition(event: MouseEvent): Point {
      const rect = (this.$refs.canvas as HTMLElement).getBoundingClientRect();
      const x = Math.round(
        (event.clientX - rect.left) * (this.width / rect.width),
      );
      const y = Math.round(
        (event.clientY - rect.top) * (this.height / rect.height),
      );
      return new Point(x, y);
    },
  },
});
</script>

<style lang="scss" scoped></style>
