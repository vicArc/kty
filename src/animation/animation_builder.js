// The `.animate` builder behind `mob.animate.shift(...).scale(...)`.
// Lives in its own module so Mobject can import it without a cycle through the
// concrete Transform class, which registers itself here at load time.

let TransformClass = null;
/** Called by transform.js so build() can construct a Transform. */
export function registerTransform(cls) {
  TransformClass = cls;
}

export class AnimationBuilder {
  constructor(mobject) {
    this.mobject = mobject;
    this.target = mobject.copy();
    this.animArgs = {};
    this.canPassArgs = true;

    return new Proxy(this, {
      get(t, prop, receiver) {
        if (prop in t) return Reflect.get(t, prop, receiver);
        // Any other name is treated as a mobject method applied to the target.
        return (...args) => {
          t.target[prop](...args);
          return receiver;
        };
      },
    });
  }

  /** Override Transform args, e.g. mob.animate(runTime: 2).shift(...). */
  setAnimArgs(args) {
    this.animArgs = { ...this.animArgs, ...args };
    return this;
  }

  build() {
    if (!TransformClass) throw new Error('Transform not registered; import the animation module');
    return new TransformClass(this.mobject, this.target, this.animArgs);
  }
}
