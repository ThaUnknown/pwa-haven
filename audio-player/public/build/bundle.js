
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

    /* src\modules\Player.svelte generated by Svelte v3.42.5 */

    const { console: console_1, isNaN: isNaN_1 } = globals;
    const file$1 = "src\\modules\\Player.svelte";

    function create_fragment$1(ctx) {
    	let audio_1;
    	let audio_1_src_value;
    	let audio_1_updating = false;
    	let audio_1_animationframe;
    	let audio_1_is_paused = true;
    	let t0;
    	let div0;
    	let img;
    	let img_src_value;
    	let t1;
    	let nav;
    	let div1;
    	let input0;
    	let t2;
    	let div6;
    	let div3;
    	let span0;
    	let t4;
    	let span1;
    	let t5_value = (/*paused*/ ctx[6] ? 'play_arrow' : 'pause') + "";
    	let t5;
    	let t6;
    	let span2;
    	let t8;
    	let div2;
    	let t9_value = toTS(/*targetTime*/ ctx[10]) + "";
    	let t9;
    	let t10;
    	let t11_value = toTS(/*duration*/ ctx[1]) + "";
    	let t11;
    	let t12;
    	let div4;
    	let span3;
    	let t13;
    	let t14;
    	let div5;
    	let input1;
    	let t15;
    	let span4;
    	let t16_value = (/*muted*/ ctx[7] ? 'volume_off' : 'volume_up') + "";
    	let t16;
    	let t17;
    	let span5;
    	let t18_value = (/*loop*/ ctx[8] ? 'repeat_one' : 'repeat') + "";
    	let t18;
    	let mounted;
    	let dispose;

    	function audio_1_timeupdate_handler() {
    		cancelAnimationFrame(audio_1_animationframe);

    		if (!audio_1.paused) {
    			audio_1_animationframe = raf(audio_1_timeupdate_handler);
    			audio_1_updating = true;
    		}

    		/*audio_1_timeupdate_handler*/ ctx[22].call(audio_1);
    	}

    	const block = {
    		c: function create() {
    			audio_1 = element("audio");
    			t0 = space();
    			div0 = element("div");
    			img = element("img");
    			t1 = space();
    			nav = element("nav");
    			div1 = element("div");
    			input0 = element("input");
    			t2 = space();
    			div6 = element("div");
    			div3 = element("div");
    			span0 = element("span");
    			span0.textContent = "skip_previous";
    			t4 = space();
    			span1 = element("span");
    			t5 = text(t5_value);
    			t6 = space();
    			span2 = element("span");
    			span2.textContent = "skip_next";
    			t8 = space();
    			div2 = element("div");
    			t9 = text(t9_value);
    			t10 = text(" / ");
    			t11 = text(t11_value);
    			t12 = space();
    			div4 = element("div");
    			span3 = element("span");
    			t13 = text(/*name*/ ctx[0]);
    			t14 = space();
    			div5 = element("div");
    			input1 = element("input");
    			t15 = space();
    			span4 = element("span");
    			t16 = text(t16_value);
    			t17 = space();
    			span5 = element("span");
    			t18 = text(t18_value);
    			if (!src_url_equal(audio_1.src, audio_1_src_value = /*src*/ ctx[3])) attr_dev(audio_1, "src", audio_1_src_value);
    			audio_1.autoplay = true;
    			audio_1.loop = /*loop*/ ctx[8];
    			attr_dev(audio_1, "class", "svelte-qc2vzz");
    			if (/*duration*/ ctx[1] === void 0) add_render_callback(() => /*audio_1_durationchange_handler*/ ctx[21].call(audio_1));
    			add_location(audio_1, file$1, 113, 0, 3350);
    			if (!src_url_equal(img.src, img_src_value = /*cover*/ ctx[9])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "cover");
    			attr_dev(img, "class", "svelte-qc2vzz");
    			add_location(img, file$1, 115, 2, 3500);
    			attr_dev(div0, "class", "content-wrapper svelte-qc2vzz");
    			add_location(div0, file$1, 114, 0, 3467);
    			attr_dev(input0, "class", "w-full top-0 svelte-qc2vzz");
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "1");
    			attr_dev(input0, "step", "any");
    			set_style(input0, "--value", /*progress*/ ctx[11] * 100 + "%");
    			add_location(input0, file$1, 119, 4, 3655);
    			attr_dev(div1, "class", "d-flex w-full prog svelte-qc2vzz");
    			add_location(div1, file$1, 118, 2, 3617);
    			attr_dev(span0, "class", "material-icons font-size-20 ctrl pointer svelte-qc2vzz");
    			attr_dev(span0, "type", "button");
    			add_location(span0, file$1, 133, 6, 4072);
    			attr_dev(span1, "class", "material-icons font-size-24 ctrl pointer svelte-qc2vzz");
    			attr_dev(span1, "type", "button");
    			add_location(span1, file$1, 134, 6, 4171);
    			attr_dev(span2, "class", "material-icons font-size-20 ctrl pointer svelte-qc2vzz");
    			attr_dev(span2, "type", "button");
    			add_location(span2, file$1, 137, 6, 4327);
    			attr_dev(div2, "class", "text-muted center ml-10 text-nowrap svelte-qc2vzz");
    			add_location(div2, file$1, 138, 6, 4422);
    			attr_dev(div3, "class", "d-flex align-items-center svelte-qc2vzz");
    			add_location(div3, file$1, 132, 4, 4025);
    			attr_dev(span3, "class", "text-truncate text-muted svelte-qc2vzz");
    			add_location(span3, file$1, 143, 6, 4589);
    			attr_dev(div4, "class", "center px-20 mw-0 svelte-qc2vzz");
    			add_location(div4, file$1, 142, 4, 4550);
    			attr_dev(input1, "class", "ml-auto px-5 h-half svelte-qc2vzz");
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "1");
    			attr_dev(input1, "step", "any");
    			set_style(input1, "--value", /*volume*/ ctx[5] * 100 + "%");
    			add_location(input1, file$1, 146, 6, 4706);
    			attr_dev(span4, "class", "material-icons font-size-20 ctrl pointer svelte-qc2vzz");
    			attr_dev(span4, "type", "button");
    			add_location(span4, file$1, 147, 6, 4844);
    			attr_dev(span5, "class", "material-icons font-size-20 ctrl pointer svelte-qc2vzz");
    			attr_dev(span5, "type", "button");
    			add_location(span5, file$1, 150, 6, 5004);
    			attr_dev(div5, "class", "d-flex align-items-center svelte-qc2vzz");
    			add_location(div5, file$1, 145, 4, 4659);
    			attr_dev(div6, "class", "d-flex w-full flex-grow-1 px-20 justify-content-between svelte-qc2vzz");
    			add_location(div6, file$1, 131, 2, 3950);
    			attr_dev(nav, "class", "navbar navbar-fixed-bottom p-0 d-flex flex-column border-0 svelte-qc2vzz");
    			add_location(nav, file$1, 117, 0, 3541);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, audio_1, anchor);
    			/*audio_1_binding*/ ctx[19](audio_1);

    			if (!isNaN_1(/*volume*/ ctx[5])) {
    				audio_1.volume = /*volume*/ ctx[5];
    			}

    			audio_1.muted = /*muted*/ ctx[7];
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, img);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div1);
    			append_dev(div1, input0);
    			set_input_value(input0, /*progress*/ ctx[11]);
    			append_dev(nav, t2);
    			append_dev(nav, div6);
    			append_dev(div6, div3);
    			append_dev(div3, span0);
    			append_dev(div3, t4);
    			append_dev(div3, span1);
    			append_dev(span1, t5);
    			append_dev(div3, t6);
    			append_dev(div3, span2);
    			append_dev(div3, t8);
    			append_dev(div3, div2);
    			append_dev(div2, t9);
    			append_dev(div2, t10);
    			append_dev(div2, t11);
    			append_dev(div6, t12);
    			append_dev(div6, div4);
    			append_dev(div4, span3);
    			append_dev(span3, t13);
    			append_dev(div6, t14);
    			append_dev(div6, div5);
    			append_dev(div5, input1);
    			set_input_value(input1, /*volume*/ ctx[5]);
    			append_dev(div5, t15);
    			append_dev(div5, span4);
    			append_dev(span4, t16);
    			append_dev(div5, t17);
    			append_dev(div5, span5);
    			append_dev(span5, t18);

    			if (!mounted) {
    				dispose = [
    					listen_dev(audio_1, "volumechange", /*audio_1_volumechange_handler*/ ctx[20]),
    					listen_dev(audio_1, "durationchange", /*audio_1_durationchange_handler*/ ctx[21]),
    					listen_dev(audio_1, "timeupdate", audio_1_timeupdate_handler),
    					listen_dev(audio_1, "play", /*audio_1_play_pause_handler*/ ctx[23]),
    					listen_dev(audio_1, "pause", /*audio_1_play_pause_handler*/ ctx[23]),
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[24]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[24]),
    					listen_dev(input0, "mousedown", /*handleMouseDown*/ ctx[12], false, false, false),
    					listen_dev(input0, "mouseup", /*handleMouseUp*/ ctx[13], false, false, false),
    					listen_dev(input0, "input", /*handleProgress*/ ctx[14], false, false, false),
    					listen_dev(span1, "click", /*playPause*/ ctx[15], false, false, false),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[25]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[25]),
    					listen_dev(span4, "click", /*toggleMute*/ ctx[16], false, false, false),
    					listen_dev(span5, "click", /*toggleLoop*/ ctx[17], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*src*/ 8 && !src_url_equal(audio_1.src, audio_1_src_value = /*src*/ ctx[3])) {
    				attr_dev(audio_1, "src", audio_1_src_value);
    			}

    			if (dirty[0] & /*loop*/ 256) {
    				prop_dev(audio_1, "loop", /*loop*/ ctx[8]);
    			}

    			if (dirty[0] & /*volume*/ 32 && !isNaN_1(/*volume*/ ctx[5])) {
    				audio_1.volume = /*volume*/ ctx[5];
    			}

    			if (dirty[0] & /*muted*/ 128) {
    				audio_1.muted = /*muted*/ ctx[7];
    			}

    			if (!audio_1_updating && dirty[0] & /*currentTime*/ 4 && !isNaN_1(/*currentTime*/ ctx[2])) {
    				audio_1.currentTime = /*currentTime*/ ctx[2];
    			}

    			audio_1_updating = false;

    			if (dirty[0] & /*paused*/ 64 && audio_1_is_paused !== (audio_1_is_paused = /*paused*/ ctx[6])) {
    				audio_1[audio_1_is_paused ? "pause" : "play"]();
    			}

    			if (dirty[0] & /*cover*/ 512 && !src_url_equal(img.src, img_src_value = /*cover*/ ctx[9])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*progress*/ 2048) {
    				set_style(input0, "--value", /*progress*/ ctx[11] * 100 + "%");
    			}

    			if (dirty[0] & /*progress*/ 2048) {
    				set_input_value(input0, /*progress*/ ctx[11]);
    			}

    			if (dirty[0] & /*paused*/ 64 && t5_value !== (t5_value = (/*paused*/ ctx[6] ? 'play_arrow' : 'pause') + "")) set_data_dev(t5, t5_value);
    			if (dirty[0] & /*targetTime*/ 1024 && t9_value !== (t9_value = toTS(/*targetTime*/ ctx[10]) + "")) set_data_dev(t9, t9_value);
    			if (dirty[0] & /*duration*/ 2 && t11_value !== (t11_value = toTS(/*duration*/ ctx[1]) + "")) set_data_dev(t11, t11_value);
    			if (dirty[0] & /*name*/ 1) set_data_dev(t13, /*name*/ ctx[0]);

    			if (dirty[0] & /*volume*/ 32) {
    				set_style(input1, "--value", /*volume*/ ctx[5] * 100 + "%");
    			}

    			if (dirty[0] & /*volume*/ 32) {
    				set_input_value(input1, /*volume*/ ctx[5]);
    			}

    			if (dirty[0] & /*muted*/ 128 && t16_value !== (t16_value = (/*muted*/ ctx[7] ? 'volume_off' : 'volume_up') + "")) set_data_dev(t16, t16_value);
    			if (dirty[0] & /*loop*/ 256 && t18_value !== (t18_value = (/*loop*/ ctx[8] ? 'repeat_one' : 'repeat') + "")) set_data_dev(t18, t18_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(audio_1);
    			/*audio_1_binding*/ ctx[19](null);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
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

    function toTS(sec, full) {
    	if (isNaN(sec) || sec < 0) {
    		return full ? '0:00:00.00' : '00:00';
    	}

    	const hours = Math.floor(sec / 3600);
    	let minutes = Math.floor(sec / 60) - hours * 60;
    	let seconds = full ? (sec % 60).toFixed(2) : Math.floor(sec % 60);
    	if (minutes < 10) minutes = '0' + minutes;
    	if (seconds < 10) seconds = '0' + seconds;

    	return hours > 0 || full
    	? hours + ':' + minutes + ':' + seconds
    	: minutes + ':' + seconds;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let progress;
    	let targetTime;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Player', slots, []);
    	let { name = '' } = $$props;

    	// const songDataPromises = songs.map(song => {
    	//   return new Promise(resolve => {
    	//     let audio = document.createElement('audio')
    	//     audio.preload = 'metadata'
    	//     audio.onloadedmetadata = () => {
    	//       resolve(audio.duration)
    	//       URL.revokeObjectURL(audio.src)
    	//       audio = null
    	//     }
    	//     audio.src = URL.createObjectURL(song)
    	//   })
    	// })
    	// const songData = await Promise.all(songDataPromises)
    	let src = null;

    	let audio = null;
    	let volume = 1;
    	let { files = [] } = $$props;
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

    			const songDataPromises = audio.map(song => {
    				return new Promise(resolve => {
    						let audio = document.createElement('audio');
    						audio.preload = 'metadata';

    						audio.onloadedmetadata = () => {
    							resolve({ file: song, duration: audio.duration });
    							URL.revokeObjectURL(audio.src);
    							audio = null;
    						};

    						audio.src = URL.createObjectURL(song);
    					});
    			});

    			songs = await Promise.all(songDataPromises);
    			console.log(songs);
    			setSource(songs[0].file);
    		}
    	}

    	function setSource(target) {
    		if (src) URL.revokeObjectURL(src); // gc
    		let file = null;

    		if (target.constructor === String) {
    			$$invalidate(3, src = target);
    			file = target;
    		} else {
    			$$invalidate(3, src = URL.createObjectURL(target));
    			file = target.name;
    		}

    		const filename = file.substring(Math.max(file.lastIndexOf('\\'), file.lastIndexOf('/')) + 1);
    		$$invalidate(0, name = filename.substring(0, filename.lastIndexOf('.')) || filename);
    	}

    	function setCover(target = '') {
    		if (cover) URL.revokeObjectURL(cover);

    		if (target.constructor === String) {
    			$$invalidate(9, cover = target || defaultCover);
    		} else {
    			$$invalidate(9, cover = target && URL.createObjectURL(target) || defaultCover);
    		}
    	}

    	// todo use a store
    	function handleMouseDown({ target }) {
    		wasPaused = paused;
    		$$invalidate(6, paused = true);
    		$$invalidate(10, targetTime = target.value * duration);
    	}

    	function handleMouseUp() {
    		$$invalidate(6, paused = wasPaused);
    		$$invalidate(2, currentTime = targetTime);
    	}

    	function handleProgress({ target }) {
    		$$invalidate(10, targetTime = target.value * duration);
    	}

    	function playPause() {
    		$$invalidate(6, paused = !paused);
    	}

    	function toggleMute() {
    		$$invalidate(7, muted = !muted);
    	}

    	function toggleLoop() {
    		$$invalidate(8, loop = !loop);
    	}

    	const writable_props = ['name', 'files'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Player> was created with unknown prop '${key}'`);
    	});

    	function audio_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			audio = $$value;
    			$$invalidate(4, audio);
    		});
    	}

    	function audio_1_volumechange_handler() {
    		volume = this.volume;
    		muted = this.muted;
    		$$invalidate(5, volume);
    		$$invalidate(7, muted);
    	}

    	function audio_1_durationchange_handler() {
    		duration = this.duration;
    		$$invalidate(1, duration);
    	}

    	function audio_1_timeupdate_handler() {
    		currentTime = this.currentTime;
    		$$invalidate(2, currentTime);
    	}

    	function audio_1_play_pause_handler() {
    		paused = this.paused;
    		$$invalidate(6, paused);
    	}

    	function input0_change_input_handler() {
    		progress = to_number(this.value);
    		(($$invalidate(11, progress), $$invalidate(2, currentTime)), $$invalidate(1, duration));
    	}

    	function input1_change_input_handler() {
    		volume = to_number(this.value);
    		$$invalidate(5, volume);
    	}

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('files' in $$props) $$invalidate(18, files = $$props.files);
    	};

    	$$self.$capture_state = () => ({
    		name,
    		src,
    		audio,
    		volume,
    		files,
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
    		toTS,
    		handleMouseDown,
    		handleMouseUp,
    		handleProgress,
    		playPause,
    		toggleMute,
    		toggleLoop,
    		targetTime,
    		progress
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('src' in $$props) $$invalidate(3, src = $$props.src);
    		if ('audio' in $$props) $$invalidate(4, audio = $$props.audio);
    		if ('volume' in $$props) $$invalidate(5, volume = $$props.volume);
    		if ('files' in $$props) $$invalidate(18, files = $$props.files);
    		if ('songs' in $$props) songs = $$props.songs;
    		if ('duration' in $$props) $$invalidate(1, duration = $$props.duration);
    		if ('currentTime' in $$props) $$invalidate(2, currentTime = $$props.currentTime);
    		if ('paused' in $$props) $$invalidate(6, paused = $$props.paused);
    		if ('muted' in $$props) $$invalidate(7, muted = $$props.muted);
    		if ('loop' in $$props) $$invalidate(8, loop = $$props.loop);
    		if ('wasPaused' in $$props) wasPaused = $$props.wasPaused;
    		if ('cover' in $$props) $$invalidate(9, cover = $$props.cover);
    		if ('defaultCover' in $$props) defaultCover = $$props.defaultCover;
    		if ('targetTime' in $$props) $$invalidate(10, targetTime = $$props.targetTime);
    		if ('progress' in $$props) $$invalidate(11, progress = $$props.progress);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*files*/ 262144) {
    			updateFiles(files);
    		}

    		if ($$self.$$.dirty[0] & /*currentTime, duration*/ 6) {
    			$$invalidate(11, progress = currentTime / duration);
    		}

    		if ($$self.$$.dirty[0] & /*currentTime*/ 4) {
    			$$invalidate(10, targetTime = currentTime);
    		}
    	};

    	return [
    		name,
    		duration,
    		currentTime,
    		src,
    		audio,
    		volume,
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
    		files,
    		audio_1_binding,
    		audio_1_volumechange_handler,
    		audio_1_durationchange_handler,
    		audio_1_timeupdate_handler,
    		audio_1_play_pause_handler,
    		input0_change_input_handler,
    		input1_change_input_handler
    	];
    }

    class Player extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { name: 0, files: 18 }, null, [-1, -1]);

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
    			add_location(div, file, 64, 0, 1862);
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
    			if (item.type.indexOf('audio') === 0) {
    				return item.getAsFile();
    			}

    			if (item.type === 'text/plain') {
    				return new Promise(resolve => item.getAsString(resolve));
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
