/**
 * The only scene mutation boundary. Future trusted AI adapters should submit
 * parsed JSON here, never executable code. No network access or eval is used.
 * Positions use world units; rotations use degrees; scale must stay positive.
 */
export type Primitive = 'cube' | 'sphere' | 'cylinder' | 'plane';
export type Vec3 = [number, number, number];
export interface SceneObject {
  id: string;
  name: string;
  type: Primitive;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  color: string;
}
export interface SceneState {
  objects: SceneObject[];
  selectedId: string | null;
}
export type SceneCommand =
  | { type: 'add'; primitive: Primitive; color?: string; position?: Vec3 }
  | { type: 'select'; id: string | null }
  | { type: 'update'; id: string; position?: Vec3; rotation?: Vec3; scale?: Vec3; color?: string; name?: string }
  | { type: 'delete'; id: string };
export type CommandResult =
  | { ok: true; state: SceneState; message: string }
  | { ok: false; state: SceneState; message: string };

const primitives: readonly string[] = ['cube', 'sphere', 'cylinder', 'plane'];
const colors: Record<Primitive, string> = {
  cube: '#b8a2f7', sphere: '#79c9b6', cylinder: '#f2ba79', plane: '#8bafe8',
};
const MAX_OBJECTS = 100;
const own = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

function vector(value: unknown, label: string, min: number, max: number): Vec3 {
  if (!Array.isArray(value) || value.length !== 3 ||
      !value.every(n => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max)) {
    throw new Error(`${label} must contain exactly three finite numbers from ${min} to ${max}.`);
  }
  return [...value] as Vec3;
}

function color(value: unknown): string {
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error('Color must be a six-digit hex color, for example #b8a2f7.');
  }
  return value;
}

function identifier(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 100) {
    throw new Error('An existing object ID is required.');
  }
  return value;
}

export function createInitialScene(): SceneState {
  return {
    objects: [{
      id: 'cube-1', name: 'Cube', type: 'cube', position: [0, 0.75, 0],
      rotation: [0, 0, 0], scale: [1, 1, 1], color: colors.cube,
    }],
    selectedId: 'cube-1',
  };
}

/** Rejected commands return the original state unchanged. Unknown fields fail. */
export function executeSceneCommand(state: SceneState, input: unknown): CommandResult {
  try {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new Error('Command must be a JSON object.');
    }
    const command = input as Record<string, unknown>;
    const fields: Record<string, readonly string[]> = {
      add: ['type', 'primitive', 'color', 'position'],
      select: ['type', 'id'],
      update: ['type', 'id', 'position', 'rotation', 'scale', 'color', 'name'],
      delete: ['type', 'id'],
    };
    if (typeof command.type !== 'string' || !own(fields, command.type)) {
      throw new Error('Unknown command. Use add, select, update, or delete.');
    }
    const allowed = fields[command.type]!;
    if (Object.keys(command).some(key => !allowed.includes(key))) {
      throw new Error('Command contains unsupported fields.');
    }
    if (command.type === 'add') {
      if (typeof command.primitive !== 'string' || !primitives.includes(command.primitive)) {
        throw new Error('Primitive must be cube, sphere, cylinder, or plane.');
      }
      if (state.objects.length >= MAX_OBJECTS) throw new Error('Scene limit reached: 100 objects.');
      const primitive = command.primitive as Primitive;
      let index = 1;
      while (state.objects.some(object => object.id === `${primitive}-${index}`)) index++;
      const object: SceneObject = {
        id: `${primitive}-${index}`,
        name: `${primitive[0]!.toUpperCase()}${primitive.slice(1)}${index > 1 ? ` ${index}` : ''}`,
        type: primitive,
        position: own(command, 'position') ? vector(command.position, 'Position', -1000, 1000) : [0, primitive === 'plane' ? 0.02 : 0.75, 0],
        rotation: [0, 0, 0], scale: [1, 1, 1],
        color: own(command, 'color') ? color(command.color) : colors[primitive],
      };
      return { ok: true, state: { objects: [...state.objects, object], selectedId: object.id }, message: `${object.name} added.` };
    }
    if (command.type === 'select' && command.id === null) {
      return { ok: true, state: { ...state, selectedId: null }, message: 'Selection cleared.' };
    }
    const id = identifier(command.id);
    const target = state.objects.find(object => object.id === id);
    if (!target) throw new Error(`Object "${id}" was not found.`);
    if (command.type === 'select') {
      return { ok: true, state: { ...state, selectedId: id }, message: `${target.name} selected.` };
    }
    if (command.type === 'delete') {
      return {
        ok: true,
        state: { objects: state.objects.filter(object => object.id !== id), selectedId: state.selectedId === id ? null : state.selectedId },
        message: `${target.name} deleted.`,
      };
    }
    const updated = { ...target };
    if (own(command, 'position')) updated.position = vector(command.position, 'Position', -1000, 1000);
    if (own(command, 'rotation')) updated.rotation = vector(command.rotation, 'Rotation', -36000, 36000);
    if (own(command, 'scale')) updated.scale = vector(command.scale, 'Scale', 0.01, 100);
    if (own(command, 'color')) updated.color = color(command.color);
    if (own(command, 'name')) {
      if (typeof command.name !== 'string' || !command.name.trim() || command.name.length > 60) {
        throw new Error('Name must contain between 1 and 60 characters.');
      }
      updated.name = command.name.trim();
    }
    return {
      ok: true,
      state: { ...state, objects: state.objects.map(object => object.id === id ? updated : object) },
      message: `${updated.name} updated.`,
    };
  } catch (error) {
    return { ok: false, state, message: error instanceof Error ? error.message : 'Invalid command.' };
  }
}
