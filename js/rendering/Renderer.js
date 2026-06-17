import MapRenderer from './MapRenderer.js';
import EntityRenderer from './EntityRenderer.js';
import EffectsRenderer from './EffectsRenderer.js';

// Coordinates the three canvas layers.
export default class Renderer {
  constructor(canvases, grid) {
    this.mapCtx = canvases.map.getContext('2d');
    this.entitiesCtx = canvases.entities.getContext('2d');
    this.effectsCtx = canvases.effects.getContext('2d');

    this.mapRenderer = new MapRenderer(this.mapCtx, grid);
    this.entityRenderer = new EntityRenderer(this.entitiesCtx);
    this.effectsRenderer = new EffectsRenderer(this.effectsCtx);

    this.mapDirty = true;
  }

  drawMapIfDirty() {
    if (this.mapDirty) {
      this.mapRenderer.draw();
      this.mapDirty = false;
    }
  }

  markMapDirty() {
    this.mapDirty = true;
  }

  drawFrame(towers, enemies, hero, projectiles, effectsSystem, selectedTowerId) {
    this.drawMapIfDirty();
    this.entityRenderer.draw(towers, enemies, hero, projectiles, selectedTowerId);
    this.effectsRenderer.draw(effectsSystem);
  }
}
