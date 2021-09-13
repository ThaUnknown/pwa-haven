
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.4' }, detail), true));
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
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

    /* src\App.svelte generated by Svelte v3.42.4 */

    const { window: window_1 } = globals;
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let audio_1;
    	let audio_1_src_value;
    	let audio_1_updating = false;
    	let audio_1_animationframe;
    	let audio_1_is_paused = true;
    	let t0;
    	let div4;
    	let div0;
    	let t1;
    	let nav;
    	let div1;
    	let input0;
    	let t2;
    	let div3;
    	let div2;
    	let span;
    	let t3_value = (/*paused*/ ctx[6] ? 'play_arrow' : 'pause') + "";
    	let t3;
    	let t4;
    	let input1;
    	let t5;
    	let title_value;
    	let mounted;
    	let dispose;

    	function audio_1_timeupdate_handler() {
    		cancelAnimationFrame(audio_1_animationframe);

    		if (!audio_1.paused) {
    			audio_1_animationframe = raf(audio_1_timeupdate_handler);
    			audio_1_updating = true;
    		}

    		/*audio_1_timeupdate_handler*/ ctx[21].call(audio_1);
    	}

    	document.title = title_value = /*name*/ ctx[3] || 'Audio Player';

    	const block = {
    		c: function create() {
    			audio_1 = element("audio");
    			t0 = space();
    			div4 = element("div");
    			div0 = element("div");
    			t1 = space();
    			nav = element("nav");
    			div1 = element("div");
    			input0 = element("input");
    			t2 = space();
    			div3 = element("div");
    			div2 = element("div");
    			span = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			if (!src_url_equal(audio_1.src, audio_1_src_value = /*src*/ ctx[2])) attr_dev(audio_1, "src", audio_1_src_value);
    			audio_1.autoplay = true;
    			attr_dev(audio_1, "class", "svelte-f3ouuq");
    			if (/*duration*/ ctx[0] === void 0) add_render_callback(() => /*audio_1_durationchange_handler*/ ctx[20].call(audio_1));
    			add_location(audio_1, file, 81, 0, 2150);
    			attr_dev(div0, "class", "content-wrapper svelte-f3ouuq");
    			add_location(div0, file, 83, 2, 2302);
    			attr_dev(input0, "class", "w-full top-0 d-flex align-items-start svelte-f3ouuq");
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "1");
    			attr_dev(input0, "step", "any");
    			set_style(input0, "--value", /*progress*/ ctx[7] * 100 + "%");
    			add_location(input0, file, 86, 6, 2447);
    			attr_dev(div1, "class", "d-flex w-full svelte-f3ouuq");
    			add_location(div1, file, 85, 4, 2413);
    			attr_dev(span, "class", "material-icons font-size-24 svelte-f3ouuq");
    			attr_dev(span, "type", "button");
    			add_location(span, file, 100, 8, 2900);
    			attr_dev(div2, "class", "ctrl pointer svelte-f3ouuq");
    			add_location(div2, file, 99, 6, 2844);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "1");
    			attr_dev(input1, "step", "any");
    			set_style(input1, "--value", /*volume*/ ctx[5] * 100 + "%");
    			attr_dev(input1, "class", "svelte-f3ouuq");
    			add_location(input1, file, 104, 6, 3036);
    			attr_dev(div3, "class", "d-flex w-full flex-grow-1 align-items-center svelte-f3ouuq");
    			add_location(div3, file, 98, 4, 2779);
    			attr_dev(nav, "class", "navbar navbar-fixed-bottom p-0 d-flex flex-column border-0 svelte-f3ouuq");
    			add_location(nav, file, 84, 2, 2336);
    			attr_dev(div4, "class", "page-wrapper with-navbar-fixed-bottom svelte-f3ouuq");
    			add_location(div4, file, 82, 0, 2248);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, audio_1, anchor);
    			/*audio_1_binding*/ ctx[18](audio_1);

    			if (!isNaN(/*volume*/ ctx[5])) {
    				audio_1.volume = /*volume*/ ctx[5];
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div4, t1);
    			append_dev(div4, nav);
    			append_dev(nav, div1);
    			append_dev(div1, input0);
    			set_input_value(input0, /*progress*/ ctx[7]);
    			append_dev(nav, t2);
    			append_dev(nav, div3);
    			append_dev(div3, div2);
    			append_dev(div2, span);
    			append_dev(span, t3);
    			append_dev(div3, t4);
    			append_dev(div3, input1);
    			set_input_value(input1, /*volume*/ ctx[5]);
    			insert_dev(target, t5, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1, "drop", prevent_default(/*handleDrop*/ ctx[8]), false, true, false),
    					listen_dev(window_1, "dragenter", prevent_default(/*dragenter_handler*/ ctx[14]), false, true, false),
    					listen_dev(window_1, "dragover", prevent_default(/*dragover_handler*/ ctx[15]), false, true, false),
    					listen_dev(window_1, "dragstart", prevent_default(/*dragstart_handler*/ ctx[16]), false, true, false),
    					listen_dev(window_1, "dragleave", prevent_default(/*dragleave_handler*/ ctx[17]), false, true, false),
    					listen_dev(window_1, "paste", prevent_default(/*handlePaste*/ ctx[9]), false, true, false),
    					listen_dev(audio_1, "volumechange", /*audio_1_volumechange_handler*/ ctx[19]),
    					listen_dev(audio_1, "durationchange", /*audio_1_durationchange_handler*/ ctx[20]),
    					listen_dev(audio_1, "timeupdate", audio_1_timeupdate_handler),
    					listen_dev(audio_1, "play", /*audio_1_play_pause_handler*/ ctx[22]),
    					listen_dev(audio_1, "pause", /*audio_1_play_pause_handler*/ ctx[22]),
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[23]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[23]),
    					listen_dev(input0, "mousedown", /*handleMouseDown*/ ctx[10], false, false, false),
    					listen_dev(input0, "mouseup", /*handleMouseUp*/ ctx[11], false, false, false),
    					listen_dev(input0, "input", /*handleProgress*/ ctx[12], false, false, false),
    					listen_dev(div2, "click", /*playPause*/ ctx[13], false, false, false),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[24]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[24])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*src*/ 4 && !src_url_equal(audio_1.src, audio_1_src_value = /*src*/ ctx[2])) {
    				attr_dev(audio_1, "src", audio_1_src_value);
    			}

    			if (dirty & /*volume*/ 32 && !isNaN(/*volume*/ ctx[5])) {
    				audio_1.volume = /*volume*/ ctx[5];
    			}

    			if (!audio_1_updating && dirty & /*currentTime*/ 2 && !isNaN(/*currentTime*/ ctx[1])) {
    				audio_1.currentTime = /*currentTime*/ ctx[1];
    			}

    			audio_1_updating = false;

    			if (dirty & /*paused*/ 64 && audio_1_is_paused !== (audio_1_is_paused = /*paused*/ ctx[6])) {
    				audio_1[audio_1_is_paused ? "pause" : "play"]();
    			}

    			if (dirty & /*progress*/ 128) {
    				set_style(input0, "--value", /*progress*/ ctx[7] * 100 + "%");
    			}

    			if (dirty & /*progress*/ 128) {
    				set_input_value(input0, /*progress*/ ctx[7]);
    			}

    			if (dirty & /*paused*/ 64 && t3_value !== (t3_value = (/*paused*/ ctx[6] ? 'play_arrow' : 'pause') + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*volume*/ 32) {
    				set_style(input1, "--value", /*volume*/ ctx[5] * 100 + "%");
    			}

    			if (dirty & /*volume*/ 32) {
    				set_input_value(input1, /*volume*/ ctx[5]);
    			}

    			if (dirty & /*name*/ 8 && title_value !== (title_value = /*name*/ ctx[3] || 'Audio Player')) {
    				document.title = title_value;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(audio_1);
    			/*audio_1_binding*/ ctx[18](null);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t5);
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

    function instance($$self, $$props, $$invalidate) {
    	let progress;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let src = null;
    	let name = null;
    	let audio = null;
    	let volume = 1;
    	let duration = 1;
    	let currentTime = 0;
    	let targetTime = 0;
    	let paused = true;
    	let wasPaused = true;
    	const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser());

    	function setSource(target) {
    		if (src) URL.revokeObjectURL(src); // gc

    		if (target.constructor === String) {
    			$$invalidate(2, src = target);
    			const startIndex = Math.max(target.lastIndexOf('\\'), target.lastIndexOf('/')) + 1;
    			$$invalidate(3, name = target.substring(startIndex));
    		} else {
    			$$invalidate(2, src = URL.createObjectURL(target));
    			const startIndex = Math.max(target.name.lastIndexOf('\\'), target.name.lastIndexOf('/')) + 1;
    			$$invalidate(3, name = target.name.substring(startIndex));
    		}
    	}

    	// loading files
    	function handleDrop(e) {
    		const { dataTransfer: { files } } = e;

    		if (files && files[0]) {
    			if (files[0].type) {
    				setSource(files[0]);
    			} // handle directory, find cover art, oh man why am i doing this to myself
    		}
    	}

    	function handlePaste(e) {
    		const item = e.clipboardData.items[0];

    		if (item?.type.indexOf('audio') === 0) {
    			setSource(item.getAsFile());
    		} else if (item?.type === 'text/plain') {
    			item.getAsString(setSource);
    		} else if (item?.type === 'text/html') {
    			item.getAsString(text => {
    				const audio = DOMPARSER(text, 'text/html').querySelector('audio');
    				if (audio) setSource(audio.src);
    			});
    		}
    	}

    	if ('launchQueue' in window) {
    		launchQueue.setConsumer(async launchParams => {
    			if (!launchParams.files.length) {
    				return;
    			}

    			setSource(await launchParams.files[0].getFile());
    		});
    	}

    	// todo use a store
    	function handleMouseDown({ target }) {
    		wasPaused = paused;
    		$$invalidate(6, paused = true);
    		targetTime = target.value * duration;
    	}

    	function handleMouseUp() {
    		$$invalidate(6, paused = wasPaused);
    		$$invalidate(1, currentTime = targetTime);
    	}

    	function handleProgress({ target }) {
    		targetTime = target.value * duration;
    	}

    	function playPause() {
    		$$invalidate(6, paused = !paused);
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

    	function audio_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			audio = $$value;
    			$$invalidate(4, audio);
    		});
    	}

    	function audio_1_volumechange_handler() {
    		volume = this.volume;
    		$$invalidate(5, volume);
    	}

    	function audio_1_durationchange_handler() {
    		duration = this.duration;
    		$$invalidate(0, duration);
    	}

    	function audio_1_timeupdate_handler() {
    		currentTime = this.currentTime;
    		$$invalidate(1, currentTime);
    	}

    	function audio_1_play_pause_handler() {
    		paused = this.paused;
    		$$invalidate(6, paused);
    	}

    	function input0_change_input_handler() {
    		progress = to_number(this.value);
    		(($$invalidate(7, progress), $$invalidate(1, currentTime)), $$invalidate(0, duration));
    	}

    	function input1_change_input_handler() {
    		volume = to_number(this.value);
    		$$invalidate(5, volume);
    	}

    	$$self.$capture_state = () => ({
    		src,
    		name,
    		audio,
    		volume,
    		duration,
    		currentTime,
    		targetTime,
    		paused,
    		wasPaused,
    		DOMPARSER,
    		setSource,
    		handleDrop,
    		handlePaste,
    		handleMouseDown,
    		handleMouseUp,
    		handleProgress,
    		playPause,
    		progress
    	});

    	$$self.$inject_state = $$props => {
    		if ('src' in $$props) $$invalidate(2, src = $$props.src);
    		if ('name' in $$props) $$invalidate(3, name = $$props.name);
    		if ('audio' in $$props) $$invalidate(4, audio = $$props.audio);
    		if ('volume' in $$props) $$invalidate(5, volume = $$props.volume);
    		if ('duration' in $$props) $$invalidate(0, duration = $$props.duration);
    		if ('currentTime' in $$props) $$invalidate(1, currentTime = $$props.currentTime);
    		if ('targetTime' in $$props) targetTime = $$props.targetTime;
    		if ('paused' in $$props) $$invalidate(6, paused = $$props.paused);
    		if ('wasPaused' in $$props) wasPaused = $$props.wasPaused;
    		if ('progress' in $$props) $$invalidate(7, progress = $$props.progress);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*currentTime, duration*/ 3) {
    			$$invalidate(7, progress = currentTime / duration);
    		}
    	};

    	return [
    		duration,
    		currentTime,
    		src,
    		name,
    		audio,
    		volume,
    		paused,
    		progress,
    		handleDrop,
    		handlePaste,
    		handleMouseDown,
    		handleMouseUp,
    		handleProgress,
    		playPause,
    		dragenter_handler,
    		dragover_handler,
    		dragstart_handler,
    		dragleave_handler,
    		audio_1_binding,
    		audio_1_volumechange_handler,
    		audio_1_durationchange_handler,
    		audio_1_timeupdate_handler,
    		audio_1_play_pause_handler,
    		input0_change_input_handler,
    		input1_change_input_handler
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
