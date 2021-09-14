
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
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
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.5' }, detail), true));
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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

    function toTS (sec, full) {
      if (isNaN(sec) || sec < 0) {
        return full ? '00:00' : '0:00'
      }
      const hours = Math.floor(sec / 3600);
      let minutes = Math.floor(sec / 60) - hours * 60;
      let seconds = Math.floor(sec % 60);
      if (full && minutes < 10) minutes = '0' + minutes;
      if (seconds < 10) seconds = '0' + seconds;
      return hours > 0 ? hours + ':' + minutes + ':' + seconds : minutes + ':' + seconds
    }

    /* src\modules\SongList.svelte generated by Svelte v3.42.5 */
    const file$2 = "src\\modules\\SongList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (11:2) {#each songs as song}
    function create_each_block(ctx) {
    	let div;
    	let t0_value = /*song*/ ctx[3].name + "";
    	let t0;
    	let t1;
    	let t2_value = toTS(/*song*/ ctx[3].duration) + "";
    	let t2;
    	let t3;
    	let div_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			t3 = space();

    			attr_dev(div, "class", div_class_value = /*song*/ ctx[3] === /*current*/ ctx[0]
    			? 'text-primary'
    			: 'text-muted');

    			add_location(div, file$2, 11, 4, 202);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, t3);

    			if (!mounted) {
    				dispose = listen_dev(
    					div,
    					"click",
    					function () {
    						if (is_function(/*select*/ ctx[2](/*song*/ ctx[3]))) /*select*/ ctx[2](/*song*/ ctx[3]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*songs*/ 2 && t0_value !== (t0_value = /*song*/ ctx[3].name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*songs*/ 2 && t2_value !== (t2_value = toTS(/*song*/ ctx[3].duration) + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*songs, current*/ 3 && div_class_value !== (div_class_value = /*song*/ ctx[3] === /*current*/ ctx[0]
    			? 'text-primary'
    			: 'text-muted')) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(11:2) {#each songs as song}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let each_value = /*songs*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "col-4");
    			add_location(div, file$2, 9, 0, 152);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*songs, current, select, toTS*/ 7) {
    				each_value = /*songs*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SongList', slots, []);
    	let { current } = $$props;
    	let { songs } = $$props;

    	function select(song) {
    		$$invalidate(0, current = song);
    	}

    	const writable_props = ['current', 'songs'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SongList> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('current' in $$props) $$invalidate(0, current = $$props.current);
    		if ('songs' in $$props) $$invalidate(1, songs = $$props.songs);
    	};

    	$$self.$capture_state = () => ({ toTS, current, songs, select });

    	$$self.$inject_state = $$props => {
    		if ('current' in $$props) $$invalidate(0, current = $$props.current);
    		if ('songs' in $$props) $$invalidate(1, songs = $$props.songs);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [current, songs, select];
    }

    class SongList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { current: 0, songs: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SongList",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*current*/ ctx[0] === undefined && !('current' in props)) {
    			console.warn("<SongList> was created without expected prop 'current'");
    		}

    		if (/*songs*/ ctx[1] === undefined && !('songs' in props)) {
    			console.warn("<SongList> was created without expected prop 'songs'");
    		}
    	}

    	get current() {
    		throw new Error("<SongList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set current(value) {
    		throw new Error("<SongList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get songs() {
    		throw new Error("<SongList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set songs(value) {
    		throw new Error("<SongList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\modules\Player.svelte generated by Svelte v3.42.5 */
    const file$1 = "src\\modules\\Player.svelte";

    function create_fragment$1(ctx) {
    	let audio_1;
    	let audio_1_src_value;
    	let audio_1_updating = false;
    	let audio_1_animationframe;
    	let audio_1_is_paused = true;
    	let t0;
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;
    	let t1;
    	let songlist;
    	let updating_current;
    	let t2;
    	let nav;
    	let div2;
    	let input0;
    	let t3;
    	let div8;
    	let div4;
    	let span0;
    	let t5;
    	let span1;
    	let t6_value = (/*paused*/ ctx[8] ? 'play_arrow' : 'pause') + "";
    	let t6;
    	let t7;
    	let span2;
    	let t9;
    	let div3;
    	let t10_value = toTS(/*targetTime*/ ctx[12], true) + "";
    	let t10;
    	let t11;
    	let t12_value = toTS(/*duration*/ ctx[2], true) + "";
    	let t12;
    	let t13;
    	let div6;
    	let div5;
    	let t14;
    	let t15;
    	let div7;
    	let input1;
    	let t16;
    	let span3;
    	let t17_value = (/*muted*/ ctx[9] ? 'volume_off' : 'volume_up') + "";
    	let t17;
    	let t18;
    	let span4;
    	let t19_value = (/*loop*/ ctx[10] ? 'repeat_one' : 'repeat') + "";
    	let t19;
    	let current;
    	let mounted;
    	let dispose;

    	function audio_1_timeupdate_handler() {
    		cancelAnimationFrame(audio_1_animationframe);

    		if (!audio_1.paused) {
    			audio_1_animationframe = raf(audio_1_timeupdate_handler);
    			audio_1_updating = true;
    		}

    		/*audio_1_timeupdate_handler*/ ctx[26].call(audio_1);
    	}

    	function songlist_current_binding(value) {
    		/*songlist_current_binding*/ ctx[29](value);
    	}

    	let songlist_props = { songs: /*songs*/ ctx[7] };

    	if (/*current*/ ctx[1] !== void 0) {
    		songlist_props.current = /*current*/ ctx[1];
    	}

    	songlist = new SongList({ props: songlist_props, $$inline: true });
    	binding_callbacks.push(() => bind(songlist, 'current', songlist_current_binding));

    	const block = {
    		c: function create() {
    			audio_1 = element("audio");
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t1 = space();
    			create_component(songlist.$$.fragment);
    			t2 = space();
    			nav = element("nav");
    			div2 = element("div");
    			input0 = element("input");
    			t3 = space();
    			div8 = element("div");
    			div4 = element("div");
    			span0 = element("span");
    			span0.textContent = "skip_previous";
    			t5 = space();
    			span1 = element("span");
    			t6 = text(t6_value);
    			t7 = space();
    			span2 = element("span");
    			span2.textContent = "skip_next";
    			t9 = space();
    			div3 = element("div");
    			t10 = text(t10_value);
    			t11 = text(" / ");
    			t12 = text(t12_value);
    			t13 = space();
    			div6 = element("div");
    			div5 = element("div");
    			t14 = text(/*name*/ ctx[0]);
    			t15 = space();
    			div7 = element("div");
    			input1 = element("input");
    			t16 = space();
    			span3 = element("span");
    			t17 = text(t17_value);
    			t18 = space();
    			span4 = element("span");
    			t19 = text(t19_value);
    			if (!src_url_equal(audio_1.src, audio_1_src_value = /*src*/ ctx[4])) attr_dev(audio_1, "src", audio_1_src_value);
    			audio_1.autoplay = true;
    			audio_1.loop = /*loop*/ ctx[10];
    			attr_dev(audio_1, "class", "svelte-qc2vzz");
    			if (/*duration*/ ctx[2] === void 0) add_render_callback(() => /*audio_1_durationchange_handler*/ ctx[25].call(audio_1));
    			add_location(audio_1, file$1, 94, 0, 2666);
    			if (!src_url_equal(img.src, img_src_value = /*cover*/ ctx[11])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "cover");
    			attr_dev(img, "class", "w-full svelte-qc2vzz");
    			add_location(img, file$1, 97, 4, 2882);
    			attr_dev(div0, "class", "col-8 svelte-qc2vzz");
    			add_location(div0, file$1, 96, 2, 2857);
    			attr_dev(div1, "class", "content-wrapper row svelte-qc2vzz");
    			add_location(div1, file$1, 95, 0, 2820);
    			attr_dev(input0, "class", "w-full top-0 svelte-qc2vzz");
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "1");
    			attr_dev(input0, "step", "any");
    			set_style(input0, "--value", /*progress*/ ctx[13] * 100 + "%");
    			add_location(input0, file$1, 103, 4, 3099);
    			attr_dev(div2, "class", "d-flex w-full prog svelte-qc2vzz");
    			add_location(div2, file$1, 102, 2, 3061);
    			attr_dev(span0, "class", "material-icons font-size-20 ctrl pointer svelte-qc2vzz");
    			attr_dev(span0, "type", "button");
    			add_location(span0, file$1, 117, 6, 3516);
    			attr_dev(span1, "class", "material-icons font-size-24 ctrl pointer svelte-qc2vzz");
    			attr_dev(span1, "type", "button");
    			add_location(span1, file$1, 118, 6, 3635);
    			attr_dev(span2, "class", "material-icons font-size-20 ctrl pointer svelte-qc2vzz");
    			attr_dev(span2, "type", "button");
    			add_location(span2, file$1, 121, 6, 3791);
    			attr_dev(div3, "class", "text-muted center ml-10 text-nowrap svelte-qc2vzz");
    			add_location(div3, file$1, 122, 6, 3906);
    			attr_dev(div4, "class", "d-flex align-items-center svelte-qc2vzz");
    			add_location(div4, file$1, 116, 4, 3469);
    			attr_dev(div5, "class", "text-truncate text-muted h-full center svelte-qc2vzz");
    			add_location(div5, file$1, 127, 6, 4085);
    			attr_dev(div6, "class", "center px-20 mw-0 svelte-qc2vzz");
    			add_location(div6, file$1, 126, 4, 4046);
    			attr_dev(input1, "class", "ml-auto px-5 h-half svelte-qc2vzz");
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "1");
    			attr_dev(input1, "step", "any");
    			set_style(input1, "--value", /*volume*/ ctx[6] * 100 + "%");
    			add_location(input1, file$1, 130, 6, 4214);
    			attr_dev(span3, "class", "material-icons font-size-20 ctrl pointer svelte-qc2vzz");
    			attr_dev(span3, "type", "button");
    			add_location(span3, file$1, 131, 6, 4352);
    			attr_dev(span4, "class", "material-icons font-size-20 ctrl pointer svelte-qc2vzz");
    			attr_dev(span4, "type", "button");
    			add_location(span4, file$1, 134, 6, 4512);
    			attr_dev(div7, "class", "d-flex align-items-center svelte-qc2vzz");
    			add_location(div7, file$1, 129, 4, 4167);
    			attr_dev(div8, "class", "d-flex w-full flex-grow-1 px-20 justify-content-between svelte-qc2vzz");
    			add_location(div8, file$1, 115, 2, 3394);
    			attr_dev(nav, "class", "navbar navbar-fixed-bottom p-0 d-flex flex-column border-0 svelte-qc2vzz");
    			add_location(nav, file$1, 101, 0, 2985);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, audio_1, anchor);
    			/*audio_1_binding*/ ctx[23](audio_1);

    			if (!isNaN(/*volume*/ ctx[6])) {
    				audio_1.volume = /*volume*/ ctx[6];
    			}

    			audio_1.muted = /*muted*/ ctx[9];
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div1, t1);
    			mount_component(songlist, div1, null);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div2);
    			append_dev(div2, input0);
    			set_input_value(input0, /*progress*/ ctx[13]);
    			append_dev(nav, t3);
    			append_dev(nav, div8);
    			append_dev(div8, div4);
    			append_dev(div4, span0);
    			append_dev(div4, t5);
    			append_dev(div4, span1);
    			append_dev(span1, t6);
    			append_dev(div4, t7);
    			append_dev(div4, span2);
    			append_dev(div4, t9);
    			append_dev(div4, div3);
    			append_dev(div3, t10);
    			append_dev(div3, t11);
    			append_dev(div3, t12);
    			append_dev(div8, t13);
    			append_dev(div8, div6);
    			append_dev(div6, div5);
    			append_dev(div5, t14);
    			append_dev(div8, t15);
    			append_dev(div8, div7);
    			append_dev(div7, input1);
    			set_input_value(input1, /*volume*/ ctx[6]);
    			append_dev(div7, t16);
    			append_dev(div7, span3);
    			append_dev(span3, t17);
    			append_dev(div7, t18);
    			append_dev(div7, span4);
    			append_dev(span4, t19);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(audio_1, "volumechange", /*audio_1_volumechange_handler*/ ctx[24]),
    					listen_dev(audio_1, "durationchange", /*audio_1_durationchange_handler*/ ctx[25]),
    					listen_dev(audio_1, "timeupdate", audio_1_timeupdate_handler),
    					listen_dev(audio_1, "play", /*audio_1_play_pause_handler*/ ctx[27]),
    					listen_dev(audio_1, "pause", /*audio_1_play_pause_handler*/ ctx[27]),
    					listen_dev(audio_1, "ended", /*ended_handler*/ ctx[28], false, false, false),
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[30]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[30]),
    					listen_dev(input0, "mousedown", /*handleMouseDown*/ ctx[14], false, false, false),
    					listen_dev(input0, "mouseup", /*handleMouseUp*/ ctx[15], false, false, false),
    					listen_dev(input0, "input", /*handleProgress*/ ctx[16], false, false, false),
    					listen_dev(span0, "click", /*playLast*/ ctx[21], false, false, false),
    					listen_dev(span1, "click", /*playPause*/ ctx[17], false, false, false),
    					listen_dev(span2, "click", /*playNext*/ ctx[20], false, false, false),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[31]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[31]),
    					listen_dev(span3, "click", /*toggleMute*/ ctx[18], false, false, false),
    					listen_dev(span4, "click", /*toggleLoop*/ ctx[19], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*src*/ 16 && !src_url_equal(audio_1.src, audio_1_src_value = /*src*/ ctx[4])) {
    				attr_dev(audio_1, "src", audio_1_src_value);
    			}

    			if (!current || dirty[0] & /*loop*/ 1024) {
    				prop_dev(audio_1, "loop", /*loop*/ ctx[10]);
    			}

    			if (dirty[0] & /*volume*/ 64 && !isNaN(/*volume*/ ctx[6])) {
    				audio_1.volume = /*volume*/ ctx[6];
    			}

    			if (dirty[0] & /*muted*/ 512) {
    				audio_1.muted = /*muted*/ ctx[9];
    			}

    			if (!audio_1_updating && dirty[0] & /*currentTime*/ 8 && !isNaN(/*currentTime*/ ctx[3])) {
    				audio_1.currentTime = /*currentTime*/ ctx[3];
    			}

    			audio_1_updating = false;

    			if (dirty[0] & /*paused*/ 256 && audio_1_is_paused !== (audio_1_is_paused = /*paused*/ ctx[8])) {
    				audio_1[audio_1_is_paused ? "pause" : "play"]();
    			}

    			if (!current || dirty[0] & /*cover*/ 2048 && !src_url_equal(img.src, img_src_value = /*cover*/ ctx[11])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			const songlist_changes = {};
    			if (dirty[0] & /*songs*/ 128) songlist_changes.songs = /*songs*/ ctx[7];

    			if (!updating_current && dirty[0] & /*current*/ 2) {
    				updating_current = true;
    				songlist_changes.current = /*current*/ ctx[1];
    				add_flush_callback(() => updating_current = false);
    			}

    			songlist.$set(songlist_changes);

    			if (!current || dirty[0] & /*progress*/ 8192) {
    				set_style(input0, "--value", /*progress*/ ctx[13] * 100 + "%");
    			}

    			if (dirty[0] & /*progress*/ 8192) {
    				set_input_value(input0, /*progress*/ ctx[13]);
    			}

    			if ((!current || dirty[0] & /*paused*/ 256) && t6_value !== (t6_value = (/*paused*/ ctx[8] ? 'play_arrow' : 'pause') + "")) set_data_dev(t6, t6_value);
    			if ((!current || dirty[0] & /*targetTime*/ 4096) && t10_value !== (t10_value = toTS(/*targetTime*/ ctx[12], true) + "")) set_data_dev(t10, t10_value);
    			if ((!current || dirty[0] & /*duration*/ 4) && t12_value !== (t12_value = toTS(/*duration*/ ctx[2], true) + "")) set_data_dev(t12, t12_value);
    			if (!current || dirty[0] & /*name*/ 1) set_data_dev(t14, /*name*/ ctx[0]);

    			if (!current || dirty[0] & /*volume*/ 64) {
    				set_style(input1, "--value", /*volume*/ ctx[6] * 100 + "%");
    			}

    			if (dirty[0] & /*volume*/ 64) {
    				set_input_value(input1, /*volume*/ ctx[6]);
    			}

    			if ((!current || dirty[0] & /*muted*/ 512) && t17_value !== (t17_value = (/*muted*/ ctx[9] ? 'volume_off' : 'volume_up') + "")) set_data_dev(t17, t17_value);
    			if ((!current || dirty[0] & /*loop*/ 1024) && t19_value !== (t19_value = (/*loop*/ ctx[10] ? 'repeat_one' : 'repeat') + "")) set_data_dev(t19, t19_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(songlist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(songlist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(audio_1);
    			/*audio_1_binding*/ ctx[23](null);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			destroy_component(songlist);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(nav);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let progress;
    	let targetTime;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Player', slots, []);
    	let { name = '' } = $$props;
    	let src = null;
    	let audio = null;
    	let volume = 1;
    	let { files = [] } = $$props;
    	let current = null;
    	let songs = [];
    	let duration = -1;
    	let currentTime = 0;
    	let paused = true;
    	let muted = false;
    	let loop = false;
    	let wasPaused = true;
    	let cover;
    	let defaultCover;

    	async function updateFiles(files) {
    		if (files.length) {
    			const cover = files.find(file => file.type.indexOf('image') === 0);
    			setCover(cover);
    			const audio = files.filter(file => file.type.indexOf('audio') === 0);

    			// this is hacky, but audio context api uses x100 CPU and x140 RAM
    			const songDataPromises = audio.map(song => {
    				return new Promise(resolve => {
    						let audio = document.createElement('audio');
    						audio.preload = 'metadata';

    						audio.onloadedmetadata = () => {
    							resolve({
    								file: song,
    								duration: audio.duration,
    								name: song.name.substring(0, song.name.lastIndexOf('.')) || song.name
    							});

    							URL.revokeObjectURL(audio.src);
    							audio = null;
    						};

    						audio.src = song.url || URL.createObjectURL(song);
    					});
    			});

    			$$invalidate(7, songs = (await Promise.all(songDataPromises)).sort((a, b) => a.file.name > b.file.name
    			? 1
    			: b.file.name > a.file.name ? -1 : 0));

    			$$invalidate(1, current = songs[0]);
    		}
    	}

    	function setSource(song) {
    		if (song) {
    			if (src) URL.revokeObjectURL(src); // gc
    			$$invalidate(4, src = song.file.url || URL.createObjectURL(song.file));
    			$$invalidate(0, name = song.name);
    		}
    	}

    	function setCover(file) {
    		if (file) {
    			if (cover) URL.revokeObjectURL(cover);
    			$$invalidate(11, cover = file.url || URL.createObjectURL(file));
    		} else {
    			$$invalidate(11, cover = defaultCover);
    		}
    	}

    	// todo use a store
    	function handleMouseDown({ target }) {
    		wasPaused = paused;
    		$$invalidate(8, paused = true);
    		$$invalidate(12, targetTime = target.value * duration);
    	}

    	function handleMouseUp() {
    		$$invalidate(8, paused = wasPaused);
    		$$invalidate(3, currentTime = targetTime);
    	}

    	function handleProgress({ target }) {
    		$$invalidate(12, targetTime = target.value * duration);
    	}

    	function playPause() {
    		$$invalidate(8, paused = !paused);
    	}

    	function toggleMute() {
    		$$invalidate(9, muted = !muted);
    	}

    	function toggleLoop() {
    		$$invalidate(10, loop = !loop);
    	}

    	function playNext() {
    		$$invalidate(1, current = songs[(songs.indexOf(current) + 1) % songs.length]);
    	}

    	function playLast() {
    		const index = songs.indexOf(current);
    		$$invalidate(1, current = songs[index === 0 ? songs.length - 1 : index - 1]);
    	}

    	const writable_props = ['name', 'files'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Player> was created with unknown prop '${key}'`);
    	});

    	function audio_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			audio = $$value;
    			$$invalidate(5, audio);
    		});
    	}

    	function audio_1_volumechange_handler() {
    		volume = this.volume;
    		muted = this.muted;
    		$$invalidate(6, volume);
    		$$invalidate(9, muted);
    	}

    	function audio_1_durationchange_handler() {
    		duration = this.duration;
    		$$invalidate(2, duration);
    	}

    	function audio_1_timeupdate_handler() {
    		currentTime = this.currentTime;
    		$$invalidate(3, currentTime);
    	}

    	function audio_1_play_pause_handler() {
    		paused = this.paused;
    		$$invalidate(8, paused);
    	}

    	const ended_handler = () => !loop && playNext();

    	function songlist_current_binding(value) {
    		current = value;
    		$$invalidate(1, current);
    	}

    	function input0_change_input_handler() {
    		progress = to_number(this.value);
    		(($$invalidate(13, progress), $$invalidate(3, currentTime)), $$invalidate(2, duration));
    	}

    	function input1_change_input_handler() {
    		volume = to_number(this.value);
    		$$invalidate(6, volume);
    	}

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('files' in $$props) $$invalidate(22, files = $$props.files);
    	};

    	$$self.$capture_state = () => ({
    		toTS,
    		SongList,
    		name,
    		src,
    		audio,
    		volume,
    		files,
    		current,
    		songs,
    		duration,
    		currentTime,
    		paused,
    		muted,
    		loop,
    		wasPaused,
    		cover,
    		defaultCover,
    		updateFiles,
    		setSource,
    		setCover,
    		handleMouseDown,
    		handleMouseUp,
    		handleProgress,
    		playPause,
    		toggleMute,
    		toggleLoop,
    		playNext,
    		playLast,
    		targetTime,
    		progress
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('src' in $$props) $$invalidate(4, src = $$props.src);
    		if ('audio' in $$props) $$invalidate(5, audio = $$props.audio);
    		if ('volume' in $$props) $$invalidate(6, volume = $$props.volume);
    		if ('files' in $$props) $$invalidate(22, files = $$props.files);
    		if ('current' in $$props) $$invalidate(1, current = $$props.current);
    		if ('songs' in $$props) $$invalidate(7, songs = $$props.songs);
    		if ('duration' in $$props) $$invalidate(2, duration = $$props.duration);
    		if ('currentTime' in $$props) $$invalidate(3, currentTime = $$props.currentTime);
    		if ('paused' in $$props) $$invalidate(8, paused = $$props.paused);
    		if ('muted' in $$props) $$invalidate(9, muted = $$props.muted);
    		if ('loop' in $$props) $$invalidate(10, loop = $$props.loop);
    		if ('wasPaused' in $$props) wasPaused = $$props.wasPaused;
    		if ('cover' in $$props) $$invalidate(11, cover = $$props.cover);
    		if ('defaultCover' in $$props) defaultCover = $$props.defaultCover;
    		if ('targetTime' in $$props) $$invalidate(12, targetTime = $$props.targetTime);
    		if ('progress' in $$props) $$invalidate(13, progress = $$props.progress);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*files*/ 4194304) {
    			updateFiles(files);
    		}

    		if ($$self.$$.dirty[0] & /*currentTime, duration*/ 12) {
    			$$invalidate(13, progress = currentTime / duration);
    		}

    		if ($$self.$$.dirty[0] & /*currentTime*/ 8) {
    			$$invalidate(12, targetTime = currentTime);
    		}

    		if ($$self.$$.dirty[0] & /*current*/ 2) {
    			setSource(current);
    		}
    	};

    	return [
    		name,
    		current,
    		duration,
    		currentTime,
    		src,
    		audio,
    		volume,
    		songs,
    		paused,
    		muted,
    		loop,
    		cover,
    		targetTime,
    		progress,
    		handleMouseDown,
    		handleMouseUp,
    		handleProgress,
    		playPause,
    		toggleMute,
    		toggleLoop,
    		playNext,
    		playLast,
    		files,
    		audio_1_binding,
    		audio_1_volumechange_handler,
    		audio_1_durationchange_handler,
    		audio_1_timeupdate_handler,
    		audio_1_play_pause_handler,
    		ended_handler,
    		songlist_current_binding,
    		input0_change_input_handler,
    		input1_change_input_handler
    	];
    }

    class Player extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { name: 0, files: 22 }, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Player",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get name() {
    		throw new Error("<Player>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Player>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get files() {
    		throw new Error("<Player>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set files(value) {
    		throw new Error("<Player>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.42.5 */

    const { window: window_1 } = globals;
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let div;
    	let player;
    	let updating_name;
    	let updating_files;
    	let t;
    	let title_value;
    	let current;
    	let mounted;
    	let dispose;

    	function player_name_binding(value) {
    		/*player_name_binding*/ ctx[8](value);
    	}

    	function player_files_binding(value) {
    		/*player_files_binding*/ ctx[9](value);
    	}

    	let player_props = {};

    	if (/*name*/ ctx[0] !== void 0) {
    		player_props.name = /*name*/ ctx[0];
    	}

    	if (/*files*/ ctx[1] !== void 0) {
    		player_props.files = /*files*/ ctx[1];
    	}

    	player = new Player({ props: player_props, $$inline: true });
    	binding_callbacks.push(() => bind(player, 'name', player_name_binding));
    	binding_callbacks.push(() => bind(player, 'files', player_files_binding));
    	document.title = title_value = /*name*/ ctx[0] || 'Audio Player';

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(player.$$.fragment);
    			t = space();
    			attr_dev(div, "class", "page-wrapper with-navbar-fixed-bottom svelte-9sfuxi");
    			add_location(div, file, 77, 0, 2449);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(player, div, null);
    			insert_dev(target, t, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1, "drop", prevent_default(/*handleDrop*/ ctx[2]), false, true, false),
    					listen_dev(window_1, "dragenter", prevent_default(/*dragenter_handler*/ ctx[4]), false, true, false),
    					listen_dev(window_1, "dragover", prevent_default(/*dragover_handler*/ ctx[5]), false, true, false),
    					listen_dev(window_1, "dragstart", prevent_default(/*dragstart_handler*/ ctx[6]), false, true, false),
    					listen_dev(window_1, "dragleave", prevent_default(/*dragleave_handler*/ ctx[7]), false, true, false),
    					listen_dev(window_1, "paste", prevent_default(/*handlePaste*/ ctx[3]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const player_changes = {};

    			if (!updating_name && dirty & /*name*/ 1) {
    				updating_name = true;
    				player_changes.name = /*name*/ ctx[0];
    				add_flush_callback(() => updating_name = false);
    			}

    			if (!updating_files && dirty & /*files*/ 2) {
    				updating_files = true;
    				player_changes.files = /*files*/ ctx[1];
    				add_flush_callback(() => updating_files = false);
    			}

    			player.$set(player_changes);

    			if ((!current || dirty & /*name*/ 1) && title_value !== (title_value = /*name*/ ctx[0] || 'Audio Player')) {
    				document.title = title_value;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(player.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(player.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(player);
    			if (detaching) detach_dev(t);
    			mounted = false;
    			run_all(dispose);
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

    const audioRx = /\.(3gp|3gpp|3g2|aac|adts|ac3|amr|eac3|flac|mp3|m4a|mp4a|mpga|mp2|mp2a|mp3|m2a|m3a|oga|ogg|mogg|spx|opus|raw|wav|weba)$/i;

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser());
    	let name = '';
    	let files;

    	// loading files
    	function handleDrop({ dataTransfer }) {
    		const { items } = dataTransfer;
    		handleItems([...items]);
    	}

    	function handlePaste({ clipboardData }) {
    		const { items } = clipboardData;
    		handleItems([...items]);
    	}

    	async function handleItems(items) {
    		const promises = items.map(item => {
    			if (item.type.indexOf('audio') === 0 || item.type.indexOf('image') === 0) {
    				return item.getAsFile();
    			}

    			if (item.type === 'text/plain') {
    				return new Promise(resolve => item.getAsString(url => {
    						if (audioRx.test(url)) {
    							const filename = url.substring(Math.max(url.lastIndexOf('\\'), url.lastIndexOf('/')) + 1);
    							const name = filename.substring(0, filename.lastIndexOf('.')) || filename;
    							resolve({ name, url, type: 'audio/' });
    						}

    						resolve();
    					}));
    			}

    			if (item.type === 'text/html') {
    				return new Promise(resolve => item.getAsString(string => {
    						const elems = DOMPARSER(string, 'text/html').querySelectorAll('audio');
    						if (elems.length) resolve(elems.map(audio => audio?.src));
    						resolve();
    					}));
    			}

    			if (!item.type) {
    				let folder = item.webkitGetAsEntry();
    				folder = folder.isDirectory && folder;

    				if (folder) {
    					return new Promise(resolve => {
    							folder.createReader().readEntries(async entries => {
    								const filePromises = entries.filter(entry => entry.isFile).map(file => new Promise(resolve => file.file(resolve)));
    								resolve(await Promise.all(filePromises));
    							});
    						});
    				}

    				return;
    			}

    			return;
    		});

    		$$invalidate(1, files = (await Promise.all(promises)).flat().filter(i => i));
    	}

    	if ('launchQueue' in window) {
    		launchQueue.setConsumer(async launchParams => {
    			if (!launchParams.files.length) {
    				return;
    			}

    			const promises = launchParams.files.map(file => file.getFile());
    			$$invalidate(1, files = await Promise.all(promises));
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function dragenter_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function dragover_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function dragstart_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function dragleave_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function player_name_binding(value) {
    		name = value;
    		$$invalidate(0, name);
    	}

    	function player_files_binding(value) {
    		files = value;
    		$$invalidate(1, files);
    	}

    	$$self.$capture_state = () => ({
    		Player,
    		DOMPARSER,
    		name,
    		files,
    		handleDrop,
    		handlePaste,
    		audioRx,
    		handleItems
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('files' in $$props) $$invalidate(1, files = $$props.files);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		files,
    		handleDrop,
    		handlePaste,
    		dragenter_handler,
    		dragover_handler,
    		dragstart_handler,
    		dragleave_handler,
    		player_name_binding,
    		player_files_binding
    	];
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

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
