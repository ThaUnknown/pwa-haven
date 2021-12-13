
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.43.2 */

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let div13;
    	let div12;
    	let div11;
    	let h20;
    	let t1;
    	let p0;
    	let t2;
    	let t3_value = supportText(/*offline*/ ctx[0]) + "";
    	let t3;
    	let t4;
    	let p1;
    	let t5;
    	let t6_value = supportText(/*desktop*/ ctx[1]) + "";
    	let t6;
    	let t7;
    	let p2;
    	let t8;
    	let t9_value = supportText(/*files*/ ctx[5]) + "";
    	let t9;
    	let t10;
    	let p3;
    	let t11;
    	let t12_value = supportText(/*audio*/ ctx[2]) + "";
    	let t12;
    	let t13;
    	let p4;
    	let t14;
    	let t15_value = supportText(/*cast*/ ctx[3]) + "";
    	let t15;
    	let t16;
    	let p5;
    	let t17;
    	let t18_value = supportText(/*controls*/ ctx[4]) + "";
    	let t18;
    	let t19;
    	let h21;
    	let t21;
    	let div10;
    	let a0;
    	let div1;
    	let div0;
    	let p6;
    	let t23;
    	let p7;
    	let t25;
    	let a1;
    	let div3;
    	let div2;
    	let p8;
    	let t27;
    	let p9;
    	let t29;
    	let a2;
    	let div5;
    	let div4;
    	let p10;
    	let t31;
    	let p11;
    	let t33;
    	let a3;
    	let div7;
    	let div6;
    	let p12;
    	let t35;
    	let p13;
    	let t37;
    	let a4;
    	let div9;
    	let div8;
    	let p14;
    	let t39;
    	let p15;

    	const block = {
    		c: function create() {
    			div13 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Feature Support";
    			t1 = space();
    			p0 = element("p");
    			t2 = text("Offline Mode ");
    			t3 = text(t3_value);
    			t4 = space();
    			p1 = element("p");
    			t5 = text("Desktop Mode ");
    			t6 = text(t6_value);
    			t7 = space();
    			p2 = element("p");
    			t8 = text("Native File Handling ");
    			t9 = text(t9_value);
    			t10 = space();
    			p3 = element("p");
    			t11 = text("Multi Audio Tracks in Video ");
    			t12 = text(t12_value);
    			t13 = space();
    			p4 = element("p");
    			t14 = text("Casting ");
    			t15 = text(t15_value);
    			t16 = space();
    			p5 = element("p");
    			t17 = text("Media Controls ");
    			t18 = text(t18_value);
    			t19 = space();
    			h21 = element("h2");
    			h21.textContent = "App List";
    			t21 = space();
    			div10 = element("div");
    			a0 = element("a");
    			div1 = element("div");
    			div0 = element("div");
    			p6 = element("p");
    			p6.textContent = "Image Viewer";
    			t23 = space();
    			p7 = element("p");
    			p7.textContent = "Simple and Fast Image Viewer";
    			t25 = space();
    			a1 = element("a");
    			div3 = element("div");
    			div2 = element("div");
    			p8 = element("p");
    			p8.textContent = "Audio Player";
    			t27 = space();
    			p9 = element("p");
    			p9.textContent = "Simple and Fast Audio Player";
    			t29 = space();
    			a2 = element("a");
    			div5 = element("div");
    			div4 = element("div");
    			p10 = element("p");
    			p10.textContent = "Video Player";
    			t31 = space();
    			p11 = element("p");
    			p11.textContent = "Simple and Powerful Video Player";
    			t33 = space();
    			a3 = element("a");
    			div7 = element("div");
    			div6 = element("div");
    			p12 = element("p");
    			p12.textContent = "Torrent Client";
    			t35 = space();
    			p13 = element("p");
    			p13.textContent = "Simple Torrent Client";
    			t37 = space();
    			a4 = element("a");
    			div9 = element("div");
    			div8 = element("div");
    			p14 = element("p");
    			p14.textContent = "Screen Recorder";
    			t39 = space();
    			p15 = element("p");
    			p15.textContent = "Simple and Powerful Screen Recorder";
    			attr_dev(h20, "class", "content-title");
    			add_location(h20, file, 22, 6, 668);
    			attr_dev(p0, "class", "mt-0 mb-0 " + supportClass(/*offline*/ ctx[0]) + " svelte-1ggk6ul");
    			attr_dev(p0, "title", "Service Worker");
    			add_location(p0, file, 23, 6, 721);
    			attr_dev(p1, "class", "mt-0 mb-0 " + supportClass(/*desktop*/ ctx[1]) + " svelte-1ggk6ul");
    			attr_dev(p1, "title", "PWA Installing");
    			add_location(p1, file, 24, 6, 835);
    			attr_dev(p2, "class", "mt-0 mb-0 " + supportClass(/*files*/ ctx[5]) + " svelte-1ggk6ul");
    			attr_dev(p2, "title", "chrome://flags/#file-handling-api");
    			add_location(p2, file, 25, 6, 949);
    			attr_dev(p3, "class", "mt-0 mb-0 " + supportClass(/*audio*/ ctx[2]) + " svelte-1ggk6ul");
    			attr_dev(p3, "title", "chrome://flags/#enable-experimental-web-platform-features OR media.track.enabled");
    			add_location(p3, file, 26, 6, 1086);
    			attr_dev(p4, "class", "mt-0 mb-0 " + supportClass(/*cast*/ ctx[3]) + " svelte-1ggk6ul");
    			attr_dev(p4, "title", "Presentation");
    			add_location(p4, file, 27, 6, 1277);
    			attr_dev(p5, "class", "mt-0 mb-0 " + supportClass(/*controls*/ ctx[4]) + " svelte-1ggk6ul");
    			attr_dev(p5, "title", "Media Session");
    			add_location(p5, file, 28, 6, 1378);
    			attr_dev(h21, "class", "content-title mt-20");
    			add_location(h21, file, 29, 6, 1495);
    			attr_dev(p6, "class", "m-0 font-weight-medium text-dark-lm text-light-dm text-reset");
    			add_location(p6, file, 34, 14, 1850);
    			attr_dev(p7, "class", "font-size-12 mt-0 mb-0");
    			add_location(p7, file, 35, 14, 1953);
    			attr_dev(div0, "class", "p-20 w-full m-auto");
    			add_location(div0, file, 33, 12, 1803);
    			attr_dev(div1, "class", "flex-grow-1 overflow-y-hidden d-flex align-items-center position-relative h-120");
    			add_location(div1, file, 32, 10, 1697);
    			attr_dev(a0, "href", "img-viewer/public");
    			attr_dev(a0, "class", "card w-250 mw-full m-0 p-0 d-flex mr-10 mb-10 svelte-1ggk6ul");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "rel", "noopener");
    			add_location(a0, file, 31, 8, 1573);
    			attr_dev(p8, "class", "m-0 font-weight-medium text-dark-lm text-light-dm text-reset");
    			add_location(p8, file, 43, 14, 2357);
    			attr_dev(p9, "class", "font-size-12 mt-0 mb-0");
    			add_location(p9, file, 44, 14, 2460);
    			attr_dev(div2, "class", "p-20 w-full m-auto");
    			add_location(div2, file, 42, 12, 2310);
    			attr_dev(div3, "class", "flex-grow-1 overflow-y-hidden d-flex align-items-center position-relative h-120");
    			add_location(div3, file, 41, 10, 2204);
    			attr_dev(a1, "href", "audio-player/public");
    			attr_dev(a1, "class", "card w-250 mw-full m-0 p-0 d-flex mr-10 mb-10 svelte-1ggk6ul");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "rel", "noopener");
    			add_location(a1, file, 40, 8, 2078);
    			attr_dev(p10, "class", "m-0 font-weight-medium text-dark-lm text-light-dm text-reset");
    			add_location(p10, file, 52, 14, 2864);
    			attr_dev(p11, "class", "font-size-12 mt-0 mb-0");
    			add_location(p11, file, 53, 14, 2967);
    			attr_dev(div4, "class", "p-20 w-full m-auto");
    			add_location(div4, file, 51, 12, 2817);
    			attr_dev(div5, "class", "flex-grow-1 overflow-y-hidden d-flex align-items-center position-relative h-120");
    			add_location(div5, file, 50, 10, 2711);
    			attr_dev(a2, "href", "video-player/public");
    			attr_dev(a2, "class", "card w-250 mw-full m-0 p-0 d-flex mr-10 mb-10 svelte-1ggk6ul");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "rel", "noopener");
    			add_location(a2, file, 49, 8, 2585);
    			attr_dev(p12, "class", "m-0 font-weight-medium text-dark-lm text-light-dm text-reset");
    			add_location(p12, file, 61, 14, 3377);
    			attr_dev(p13, "class", "font-size-12 mt-0 mb-0");
    			add_location(p13, file, 62, 14, 3482);
    			attr_dev(div6, "class", "p-20 w-full m-auto");
    			add_location(div6, file, 60, 12, 3330);
    			attr_dev(div7, "class", "flex-grow-1 overflow-y-hidden d-flex align-items-center position-relative h-120");
    			add_location(div7, file, 59, 10, 3224);
    			attr_dev(a3, "href", "torrent-client/public");
    			attr_dev(a3, "class", "card w-250 mw-full m-0 p-0 d-flex mr-10 mb-10 svelte-1ggk6ul");
    			attr_dev(a3, "target", "_blank");
    			attr_dev(a3, "rel", "noopener");
    			add_location(a3, file, 58, 8, 3096);
    			attr_dev(p14, "class", "m-0 font-weight-medium text-dark-lm text-light-dm text-reset");
    			add_location(p14, file, 70, 14, 3882);
    			attr_dev(p15, "class", "font-size-12 mt-0 mb-0");
    			add_location(p15, file, 71, 14, 3988);
    			attr_dev(div8, "class", "p-20 w-full m-auto");
    			add_location(div8, file, 69, 12, 3835);
    			attr_dev(div9, "class", "flex-grow-1 overflow-y-hidden d-flex align-items-center position-relative h-120");
    			add_location(div9, file, 68, 10, 3729);
    			attr_dev(a4, "href", "screen-recorder/public");
    			attr_dev(a4, "class", "card w-250 mw-full m-0 p-0 d-flex mr-10 mb-10 svelte-1ggk6ul");
    			attr_dev(a4, "target", "_blank");
    			attr_dev(a4, "rel", "noopener");
    			add_location(a4, file, 67, 8, 3600);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file, 30, 6, 1547);
    			attr_dev(div11, "class", "content");
    			add_location(div11, file, 21, 4, 640);
    			attr_dev(div12, "class", "content-wrapper");
    			add_location(div12, file, 20, 2, 606);
    			attr_dev(div13, "class", "page-wrapper");
    			add_location(div13, file, 19, 0, 577);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, h20);
    			append_dev(div11, t1);
    			append_dev(div11, p0);
    			append_dev(p0, t2);
    			append_dev(p0, t3);
    			append_dev(div11, t4);
    			append_dev(div11, p1);
    			append_dev(p1, t5);
    			append_dev(p1, t6);
    			append_dev(div11, t7);
    			append_dev(div11, p2);
    			append_dev(p2, t8);
    			append_dev(p2, t9);
    			append_dev(div11, t10);
    			append_dev(div11, p3);
    			append_dev(p3, t11);
    			append_dev(p3, t12);
    			append_dev(div11, t13);
    			append_dev(div11, p4);
    			append_dev(p4, t14);
    			append_dev(p4, t15);
    			append_dev(div11, t16);
    			append_dev(div11, p5);
    			append_dev(p5, t17);
    			append_dev(p5, t18);
    			append_dev(div11, t19);
    			append_dev(div11, h21);
    			append_dev(div11, t21);
    			append_dev(div11, div10);
    			append_dev(div10, a0);
    			append_dev(a0, div1);
    			append_dev(div1, div0);
    			append_dev(div0, p6);
    			append_dev(div0, t23);
    			append_dev(div0, p7);
    			append_dev(div10, t25);
    			append_dev(div10, a1);
    			append_dev(a1, div3);
    			append_dev(div3, div2);
    			append_dev(div2, p8);
    			append_dev(div2, t27);
    			append_dev(div2, p9);
    			append_dev(div10, t29);
    			append_dev(div10, a2);
    			append_dev(a2, div5);
    			append_dev(div5, div4);
    			append_dev(div4, p10);
    			append_dev(div4, t31);
    			append_dev(div4, p11);
    			append_dev(div10, t33);
    			append_dev(div10, a3);
    			append_dev(a3, div7);
    			append_dev(div7, div6);
    			append_dev(div6, p12);
    			append_dev(div6, t35);
    			append_dev(div6, p13);
    			append_dev(div10, t37);
    			append_dev(div10, a4);
    			append_dev(a4, div9);
    			append_dev(div9, div8);
    			append_dev(div8, p14);
    			append_dev(div8, t39);
    			append_dev(div8, p15);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div13);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function supportText(value) {
    	return value ? 'Supported' : 'Unsupported';
    }

    function supportClass(value) {
    	return value ? 'text-success' : 'text-danger';
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	const offline = 'serviceWorker' in navigator;
    	const desktop = 'onbeforeinstallprompt' in window;
    	const audio = 'audioTracks' in HTMLVideoElement.prototype;
    	const cast = 'PresentationRequest' in window;
    	const controls = 'mediaSession' in navigator;
    	const files = 'launchQueue' in window;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		offline,
    		desktop,
    		audio,
    		cast,
    		controls,
    		files,
    		supportText,
    		supportClass
    	});

    	return [offline, desktop, audio, cast, controls, files];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
