import{_ as n}from"./chunks/plugin-vue_export-helper.a53f6fca.js";import{a as s,o as a,a5 as e}from"./chunks/element-plus.55c341df.js";const f='{"title":"Configurations","description":"","frontmatter":{},"headers":[],"relativePath":"reference/configurations.md"}',p={},t=e(`<h1 id="configurations" tabindex="-1">Configurations <a class="header-anchor" href="#configurations" aria-hidden="true">#</a></h1><p>Indicates the contents to be specified in the <code>configs</code> of props.<br> All fields are optional. Values that are not specified will be used as default values.</p><div class="reference-configs"><div class="language-ts line-numbers-mode"><pre><code><span class="token punctuation">{</span>
  view<span class="token operator">:</span> <span class="token punctuation">{</span>
    scalingObjects<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token comment">// whether to expand the entire object.    default: false</span>
    panEnabled<span class="token operator">:</span> <span class="token builtin">boolean</span>     <span class="token comment">// whether the pan is enabled or not.      default: true</span>
    zoomEnabled<span class="token operator">:</span> <span class="token builtin">boolean</span>    <span class="token comment">// whether the zoom is enabled or not.     default: true</span>
    minZoomLevel<span class="token operator">:</span> <span class="token builtin">number</span>    <span class="token comment">// minimum zoom level.                     default: 0.1</span>
    maxZoomLevel<span class="token operator">:</span> <span class="token builtin">number</span>    <span class="token comment">// maximum zoom level.                     default: 64</span>
    doubleClickZoomEnabled<span class="token operator">:</span> <span class="token builtin">boolean</span>  <span class="token comment">// Whether to zoom with double click. default: true</span>
    mouseWheelZoomEnabled<span class="token operator">:</span>  <span class="token builtin">boolean</span>  <span class="token comment">// Whether to zoom with mouse wheel or not. default: true</span>
    boxSelectionEnabled<span class="token operator">:</span>    <span class="token builtin">boolean</span>
                            <span class="token comment">// Whether to enable box-selection with special key down.</span>
                            <span class="token comment">// default: false</span>
                            <span class="token comment">// * \`node.selectable\` must also be true.</span>
                            <span class="token comment">// * The special key is specified in \`view.selection.detector\`</span>
                            <span class="token comment">//   as a function with detection process.</span>
    autoPanAndZoomOnLoad<span class="token operator">:</span> <span class="token boolean">false</span> <span class="token operator">|</span> <span class="token string">&quot;center-zero&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;center-content&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;fit-content&quot;</span>
                            <span class="token comment">// whether to automatically perform pan and zoom on loading.</span>
                            <span class="token comment">// - false: do not perform pan and zoom</span>
                            <span class="token comment">// - &quot;center-zero&quot;    : perform pan to center the (0, 0)</span>
                            <span class="token comment">// - &quot;center-content&quot; : perform pan to center the content</span>
                            <span class="token comment">// - &quot;fit-content&quot;    : perform pan and zoom to fit the content</span>
                            <span class="token comment">// default: &quot;center-content&quot;</span>
    autoPanOnResize<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token comment">// whether to pan automatically to keep the center when resizing.</span>
                             <span class="token comment">// default: true</span>
    layoutHandler<span class="token operator">:</span> LayoutHandler <span class="token comment">// class to control node layout.   default: new SimpleLayout()</span>
    onSvgPanZoomInitialized<span class="token operator">:</span> <span class="token keyword">undefined</span> <span class="token operator">|</span> <span class="token punctuation">(</span>instance<span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token keyword">void</span> <span class="token comment">// callback on init svg-pan-zoom. default: undefined</span>
    grid<span class="token operator">:</span> <span class="token punctuation">{</span>
      visible<span class="token operator">:</span> <span class="token builtin">boolean</span>         <span class="token comment">// whether to show the grid in the background. default: false</span>
      interval<span class="token operator">:</span> <span class="token builtin">number</span>         <span class="token comment">// grid line spacing.                          default: 10</span>
      thickIncrements<span class="token operator">:</span> <span class="token builtin">number</span>  <span class="token comment">// increments of ticks to draw thick lines.    default: 5</span>
      line<span class="token operator">:</span> <span class="token punctuation">{</span>                  <span class="token comment">// normal line style.</span>
        color<span class="token operator">:</span> <span class="token builtin">string</span>          <span class="token comment">//   default: &quot;#e0e0e0&quot;</span>
        width<span class="token operator">:</span> <span class="token builtin">number</span>          <span class="token comment">//   default: 1</span>
        dasharray<span class="token operator">:</span> <span class="token builtin">string</span> <span class="token operator">|</span> <span class="token builtin">number</span> <span class="token comment">//   default: 1</span>
      <span class="token punctuation">}</span>
      thick<span class="token operator">:</span> <span class="token punctuation">{</span>                 <span class="token comment">// thick line style.</span>
        color<span class="token operator">:</span> <span class="token builtin">string</span>          <span class="token comment">//   default: &quot;#cccccc&quot;</span>
        width<span class="token operator">:</span> <span class="token builtin">number</span>          <span class="token comment">//   default: 1</span>
        dasharray<span class="token operator">:</span> <span class="token builtin">string</span> <span class="token operator">|</span> <span class="token builtin">number</span> <span class="token comment">//   default: 0</span>
      <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
    selection<span class="token operator">:</span> <span class="token punctuation">{</span>
      box<span class="token operator">:</span> <span class="token punctuation">{</span>                  <span class="token comment">// rectangle of selection box style.</span>
        color<span class="token operator">:</span> <span class="token builtin">string</span>         <span class="token comment">//   background color. default: &quot;#0000ff20&quot;</span>
        strokeWidth<span class="token operator">:</span> <span class="token builtin">number</span>   <span class="token comment">//   stroke width. default: 1</span>
        strokeColor<span class="token operator">:</span> <span class="token builtin">string</span>   <span class="token comment">//   stroke color. default: &quot;#aaaaff&quot;</span>
        strokeDasharray<span class="token operator">:</span> <span class="token builtin">string</span> <span class="token operator">|</span> <span class="token builtin">number</span>  <span class="token comment">// stroke dasharray. default: 0</span>
      <span class="token punctuation">}</span><span class="token punctuation">,</span>
      <span class="token function-variable function">detector</span><span class="token operator">:</span> <span class="token punctuation">(</span>event<span class="token operator">:</span> KeyboardEvent<span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token builtin">boolean</span>
          <span class="token comment">// process for detecting special key down and up, to be used if</span>
          <span class="token comment">// \`boxSelectionEnabled\` is true.</span>
          <span class="token comment">// The argument is passed the keydown and keyup events. By returning</span>
          <span class="token comment">// true for each, it is assumed that a down/up event has occurred</span>
          <span class="token comment">// with the key.</span>
          <span class="token comment">// default:</span>
          <span class="token comment">//   Process to detect Ctrl key down/up (If Mac OS, detect Cmd key).</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span>
  node<span class="token operator">:</span> <span class="token punctuation">{</span>
    normal<span class="token operator">:</span> <span class="token punctuation">{</span>
      <span class="token comment">// * These fields can also be specified with the function as \`(node: Node) =&gt; value\`.</span>
      type<span class="token operator">:</span> <span class="token string">&quot;circle&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;rect&quot;</span>  <span class="token comment">// shape type.            default: &quot;circle&quot;</span>
      radius<span class="token operator">:</span> <span class="token builtin">number</span>           <span class="token comment">// radius of circle.      default: 16</span>
      width<span class="token operator">:</span> <span class="token builtin">number</span>            <span class="token comment">// width of rect.         default: (not specified)</span>
      height<span class="token operator">:</span> <span class="token builtin">number</span>           <span class="token comment">// height of rect.        default: (not specified)</span>
      borderRadius<span class="token operator">:</span> <span class="token builtin">number</span>     <span class="token comment">// border radius of rect. default: (not specified)</span>
      color<span class="token operator">:</span> <span class="token builtin">string</span>            <span class="token comment">// fill color.            default: &quot;#4466cc&quot;</span>
      strokeWidth<span class="token operator">:</span> <span class="token builtin">number</span>      <span class="token comment">// stroke width.          default: 0</span>
      strokeColor<span class="token operator">:</span> <span class="token builtin">string</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>              <span class="token comment">// stroke color.      default: &quot;#000000&quot;</span>
      strokeDasharray<span class="token operator">:</span> <span class="token builtin">number</span> <span class="token operator">|</span> <span class="token builtin">string</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>  <span class="token comment">// stroke dash array. default: 0</span>
    <span class="token punctuation">}</span>
    hover<span class="token operator">:</span> <span class="token punctuation">{</span> <span class="token comment">/* same structure as \`node.normal\`. */</span> <span class="token punctuation">}</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>
        <span class="token comment">// default: {</span>
        <span class="token comment">//   color: &quot;#3355bb&quot;</span>
        <span class="token comment">//   ... all other values are same as \`normal\`</span>
        <span class="token comment">// }</span>
    selected<span class="token operator">:</span> <span class="token punctuation">{</span> <span class="token comment">/* same structure as \`node.normal\`. */</span> <span class="token punctuation">}</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>
        <span class="token comment">// default: undefined</span>
    draggable<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token operator">|</span> <span class="token punctuation">(</span>node<span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token builtin">boolean</span> <span class="token comment">// whether the node is draggable or not.  default: true</span>
    selectable<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token operator">|</span> <span class="token builtin">number</span> <span class="token operator">|</span> <span class="token punctuation">(</span>node<span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token builtin">boolean</span>
        <span class="token comment">// whether the node is selectable or not. default: false</span>
        <span class="token comment">// When specified as a number it means the max number of nodes that can be selected.</span>
    label<span class="token operator">:</span> <span class="token punctuation">{</span>
      <span class="token comment">// * These fields can also be specified with the function as \`(node) =&gt; value\`.</span>
      visible<span class="token operator">:</span> <span class="token builtin">boolean</span>         <span class="token comment">// whether the node&#39;s label is visible or not. default: true</span>
      fontFamily<span class="token operator">:</span> <span class="token builtin">string</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>  <span class="token comment">// font family.       default: undefined</span>
      fontSize<span class="token operator">:</span> <span class="token builtin">number</span>                <span class="token comment">// font size.         default: 11</span>
      lineHeight<span class="token operator">:</span> <span class="token builtin">number</span>              <span class="token comment">// line height (multiplier for font size). default: 1.1</span>
      color<span class="token operator">:</span> <span class="token builtin">string</span>                   <span class="token comment">// font color.        default: &quot;#000000&quot;</span>
      background<span class="token operator">:</span> <span class="token punctuation">{</span>                    <span class="token comment">// background config. default: undefined</span>
        visible<span class="token operator">:</span> <span class="token builtin">boolean</span>          <span class="token comment">// whether the background is visible or not.</span>
        color<span class="token operator">:</span> <span class="token builtin">string</span>             <span class="token comment">// background color.</span>
        padding<span class="token operator">:</span> <span class="token builtin">number</span> <span class="token operator">|</span> <span class="token punctuation">{</span>        <span class="token comment">// padding.</span>
          vertical<span class="token operator">:</span> <span class="token builtin">number</span>        <span class="token comment">// vertical padding.</span>
          horizontal<span class="token operator">:</span> <span class="token builtin">number</span>      <span class="token comment">// horizontal padding.</span>
        <span class="token punctuation">}</span>
        borderRadius<span class="token operator">:</span> <span class="token builtin">number</span>       <span class="token comment">// border radius.</span>
      <span class="token punctuation">}</span> <span class="token operator">|</span> <span class="token keyword">undefined</span><span class="token punctuation">,</span>
      margin<span class="token operator">:</span> <span class="token builtin">number</span><span class="token punctuation">,</span>                  <span class="token comment">// margin from node. default: 4</span>
      direction<span class="token operator">:</span> <span class="token string">&quot;center&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;north&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;north-east&quot;</span> <span class="token operator">|</span>
                 <span class="token string">&quot;east&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;south-east&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;south&quot;</span> <span class="token operator">|</span>
                 <span class="token string">&quot;south-west&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;west&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;north-west&quot;</span><span class="token punctuation">,</span>
                 <span class="token comment">// node label display direction. default: &quot;south&quot;</span>
      text<span class="token operator">:</span> <span class="token builtin">string</span>    <span class="token comment">// field name in the node object to use as the label. default: &quot;name&quot;</span>
                      <span class="token comment">// if function is specified the return value is string of label.</span>
    <span class="token punctuation">}</span>
    focusring<span class="token operator">:</span> <span class="token punctuation">{</span>
      visible<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token comment">// whether the focus ring is visible or not.     default: true</span>
      width<span class="token operator">:</span> <span class="token builtin">number</span>    <span class="token comment">// line width of the focus ring.                 default: 4</span>
      padding<span class="token operator">:</span> <span class="token builtin">number</span>  <span class="token comment">// distance between the focus ring and the node. default: 3</span>
      color<span class="token operator">:</span> <span class="token builtin">string</span>     <span class="token comment">// fill color.                                   default: &quot;#eebb00&quot;</span>
    <span class="token punctuation">}</span>
    zOrder<span class="token operator">:</span> <span class="token punctuation">{</span>
      enabled<span class="token operator">:</span> <span class="token builtin">boolean</span>  <span class="token comment">// whether the z-order control is enable or not. default: false</span>
      zIndex<span class="token operator">:</span> <span class="token builtin">number</span> <span class="token operator">|</span> <span class="token punctuation">(</span>node<span class="token operator">:</span> Node<span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token builtin">number</span> <span class="token comment">// node&#39;s z-index value.   default: 0</span>
      bringToFrontOnHover<span class="token operator">:</span> <span class="token builtin">boolean</span>    <span class="token comment">// whether to bring to front on hover.    default: true</span>
      bringToFrontOnSelected<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token comment">// whether to bring to front on selected. default: true</span>
    <span class="token punctuation">}</span>
    transition<span class="token operator">:</span> <span class="token builtin">string</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>  <span class="token comment">// entering/leaving transition.      default: undefined</span>
  <span class="token punctuation">}</span>
  edge<span class="token operator">:</span> <span class="token punctuation">{</span>
    normal<span class="token operator">:</span> <span class="token punctuation">{</span>
      <span class="token comment">// * These fields can also be specified with the function as \`(edge: Edge) =&gt; value\`.</span>
      width<span class="token operator">:</span> <span class="token builtin">number</span>           <span class="token comment">// width of edge.                           default: 2</span>
      color<span class="token operator">:</span> <span class="token builtin">string</span>           <span class="token comment">// line color.                              default: &quot;#4466cc&quot;</span>
      dasharray<span class="token operator">:</span> <span class="token builtin">number</span> <span class="token operator">|</span> <span class="token builtin">string</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>        <span class="token comment">// stroke dash array. default: 0</span>
      linecap<span class="token operator">:</span> <span class="token string">&quot;butt&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;round&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;square&quot;</span> <span class="token operator">|</span> <span class="token keyword">undefined</span> <span class="token comment">// stroke linecap. default: &quot;butt&quot;</span>
      animate<span class="token operator">:</span> <span class="token builtin">boolean</span>        <span class="token comment">// whether to animate or not.               default: false</span>
      animationSpeed<span class="token operator">:</span> <span class="token builtin">number</span>   <span class="token comment">// animation speed.                         default: 100</span>
    <span class="token punctuation">}</span>
    hover<span class="token operator">:</span> <span class="token punctuation">{</span> <span class="token comment">/* same structure as \`normal\`. */</span> <span class="token punctuation">}</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>
        <span class="token comment">// default: {</span>
        <span class="token comment">//   width: () =&gt; {normal&#39;s value} + 1</span>
        <span class="token comment">//   color: &quot;#3355bb&quot;,</span>
        <span class="token comment">//   ... all other values are same as \`edge.normal\`</span>
        <span class="token comment">// },</span>
    selected<span class="token operator">:</span> <span class="token punctuation">{</span> <span class="token comment">/* same structure as \`normal\`. */</span> <span class="token punctuation">}</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>
        <span class="token comment">// default: {</span>
        <span class="token comment">//   width: () =&gt; {normal&#39;s value} + 1</span>
        <span class="token comment">//   color: &quot;#dd8800&quot;,</span>
        <span class="token comment">//   dasharray: (wider than normal&#39;s value),</span>
        <span class="token comment">//   ... all other values are same as \`edge.normal\`</span>
        <span class="token comment">// }</span>
    selectable<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token operator">|</span> <span class="token builtin">number</span> <span class="token operator">|</span> <span class="token punctuation">(</span>edge<span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token builtin">boolean</span>
        <span class="token comment">// whether the edge is selectable or not. default: false</span>
        <span class="token comment">// When specified as a number, it means the max number of edges that can be selected.</span>
    gap<span class="token operator">:</span> <span class="token builtin">number</span> <span class="token operator">|</span> <span class="token punctuation">(</span><span class="token punctuation">(</span>edges<span class="token operator">:</span> Edges<span class="token punctuation">,</span> configs<span class="token operator">:</span> Configs<span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token builtin">number</span><span class="token punctuation">)</span>
        <span class="token comment">// number: distance between edges.</span>
        <span class="token comment">// func : function to calculate gap from edge list between nodes.</span>
        <span class="token comment">// default: 3</span>
    type<span class="token operator">:</span> <span class="token string">&quot;straight&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;curve&quot;</span> <span class="token comment">// edge type when there are multiple edges between the nodes.</span>
    marker<span class="token operator">:</span> <span class="token punctuation">{</span>
      source<span class="token operator">:</span> <span class="token punctuation">{</span>
        type<span class="token operator">:</span>  <span class="token string">&quot;none&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;arrow&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;angle&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;circle&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;custom&quot;</span>
                              <span class="token comment">// type of marker.                          default: &quot;none&quot;</span>
        width<span class="token operator">:</span> <span class="token builtin">number</span>        <span class="token comment">// width of marker.                         default: 5</span>
        height<span class="token operator">:</span> <span class="token builtin">number</span>       <span class="token comment">// height of marker.                        default: 5</span>
        margin<span class="token operator">:</span> <span class="token builtin">number</span>       <span class="token comment">// distance between marker and end of edge. default: -1</span>
        units<span class="token operator">:</span> <span class="token string">&quot;strokeWidth&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;userSpaceOnUse&quot;</span>
                              <span class="token comment">// units of width, height and margin.            default: &quot;strokeWidth&quot;</span>
        color<span class="token operator">:</span> <span class="token builtin">string</span> <span class="token operator">|</span> <span class="token keyword">null</span> <span class="token comment">// color of marker. null: same as edge color.    default: null</span>
        customId<span class="token operator">:</span> <span class="token builtin">string</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>
                              <span class="token comment">// custom marker ID for marker type is &quot;custom&quot;. default: undefined</span>
      <span class="token punctuation">}</span>
      target<span class="token operator">:</span> <span class="token punctuation">{</span> <span class="token comment">/* same structure as \`source\`. */</span> <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
    margin<span class="token operator">:</span> <span class="token builtin">number</span> <span class="token operator">|</span> <span class="token keyword">null</span>
        <span class="token comment">// margin from end of node (if null, the edge end is the center of node).</span>
        <span class="token comment">// default: null</span>
    summarize<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token operator">|</span> <span class="token punctuation">(</span><span class="token punctuation">(</span>edges<span class="token operator">:</span> Edges<span class="token punctuation">,</span> configs<span class="token operator">:</span> Configs<span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token builtin">boolean</span> <span class="token operator">|</span> <span class="token keyword">null</span><span class="token punctuation">)</span>
        <span class="token comment">// true : summarize when the width of the edge becomes larger than the node.</span>
        <span class="token comment">// false: do not summarize.</span>
        <span class="token comment">// func : function to determine whether to summarize from edge list between nodes.</span>
        <span class="token comment">// default: func (if type is &quot;curve&quot; then false, otherwise summarize if the edge</span>
        <span class="token comment">//                is wider than the node size)</span>
    summarized<span class="token operator">:</span> <span class="token punctuation">{</span> <span class="token comment">// configs for summarized edge</span>
      label<span class="token operator">:</span> <span class="token punctuation">{</span>
        <span class="token comment">// * These fields can also be specified with the function as</span>
        <span class="token comment">//   \`(edges: Record&lt;string, Edge&gt;) =&gt; value\`.</span>
        fontSize<span class="token operator">:</span> <span class="token builtin">number</span>  <span class="token comment">// font size.  default: 10</span>
        color<span class="token operator">:</span> <span class="token builtin">string</span>      <span class="token comment">// font color. default: &quot;#4466cc&quot;</span>
      <span class="token punctuation">}</span>
      shape<span class="token operator">:</span> <span class="token punctuation">{</span> <span class="token comment">/* same structure as \`node.normal\`. */</span> <span class="token punctuation">}</span>
        <span class="token comment">// * These fields can also be specified with the function as</span>
        <span class="token comment">//   \`(edges: Record&lt;string, Edge&gt;) =&gt; value\`.</span>
        <span class="token comment">// default: {</span>
        <span class="token comment">//   type: &quot;rect&quot;,</span>
        <span class="token comment">//   width: 12,</span>
        <span class="token comment">//   height: 12,</span>
        <span class="token comment">//   borderRadius: 3,</span>
        <span class="token comment">//   color: &quot;#ffffff&quot;,</span>
        <span class="token comment">//   strokeWidth: 1,</span>
        <span class="token comment">//   strokeColor: &quot;#4466cc&quot;,</span>
        <span class="token comment">//   strokeDasharray: undefined</span>
        <span class="token comment">// }</span>
      stroke<span class="token operator">:</span> <span class="token punctuation">{</span> <span class="token comment">/* same structure as \`edge.normal\`. */</span> <span class="token punctuation">}</span>
        <span class="token comment">// * These fields can also be specified with the function as</span>
        <span class="token comment">//   \`(edges: Record&lt;string, Edge&gt;) =&gt; value\`.</span>
        <span class="token comment">// default: {</span>
        <span class="token comment">//   width: 5,</span>
        <span class="token comment">//   color: &quot;#4466cc&quot;,</span>
        <span class="token comment">//   dasharray: undefined,</span>
        <span class="token comment">//   linecap: undefined,</span>
        <span class="token comment">//   animate: false,</span>
        <span class="token comment">//   animationSpeed: 50</span>
        <span class="token comment">// }</span>
      <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
    keepOrder<span class="token operator">:</span> <span class="token string">&quot;clock&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;vertical&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;horizontal&quot;</span>
      <span class="token comment">// orientation to be considered when keeping multiple edge alignments.</span>
      <span class="token comment">//   &quot;clock&quot;: Keep the forward/backward when viewed as a clock.</span>
      <span class="token comment">//   &quot;vertical&quot;: Keep the vertical alignment.</span>
      <span class="token comment">//   &quot;horizontal&quot;: Keep the horizontal alignment.</span>
      <span class="token comment">// default: &quot;clock&quot;</span>
    label<span class="token operator">:</span> <span class="token punctuation">{</span>
      fontFamily<span class="token operator">:</span> <span class="token builtin">string</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>  <span class="token comment">// font family.       default: undefined</span>
      fontSize<span class="token operator">:</span> <span class="token builtin">number</span>                <span class="token comment">// font size.         default: 11</span>
      lineHeight<span class="token operator">:</span> <span class="token builtin">number</span>              <span class="token comment">// line height (multiplier for font size). default: 1.1</span>
      color<span class="token operator">:</span> <span class="token builtin">string</span>                   <span class="token comment">// font color.        default: &quot;#000000&quot;</span>
      background<span class="token operator">:</span> <span class="token punctuation">{</span>                    <span class="token comment">// background config. default: undefined</span>
        visible<span class="token operator">:</span> <span class="token builtin">boolean</span>          <span class="token comment">// whether the background is visible or not.</span>
        color<span class="token operator">:</span> <span class="token builtin">string</span>             <span class="token comment">// background color.</span>
        padding<span class="token operator">:</span> <span class="token builtin">number</span> <span class="token operator">|</span> <span class="token punctuation">{</span>        <span class="token comment">// padding.</span>
          vertical<span class="token operator">:</span> <span class="token builtin">number</span>        <span class="token comment">// vertical padding.</span>
          horizontal<span class="token operator">:</span> <span class="token builtin">number</span>      <span class="token comment">// horizontal padding.</span>
        <span class="token punctuation">}</span>
        borderRadius<span class="token operator">:</span> <span class="token builtin">number</span>       <span class="token comment">// border radius.</span>
      <span class="token punctuation">}</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>
      margin<span class="token operator">:</span> <span class="token builtin">number</span>              <span class="token comment">// distance from edge stroke. default: 4</span>
      padding<span class="token operator">:</span> <span class="token builtin">number</span>              <span class="token comment">// distance from end node. default: 4</span>
    <span class="token punctuation">}</span>
    zOrder<span class="token operator">:</span> <span class="token punctuation">{</span>
      enabled<span class="token operator">:</span> <span class="token builtin">boolean</span>  <span class="token comment">// whether the z-order control is enable or not. default: false</span>
      zIndex<span class="token operator">:</span> <span class="token builtin">number</span> <span class="token operator">|</span> <span class="token punctuation">(</span>node<span class="token operator">:</span> Node<span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token builtin">number</span> <span class="token comment">// edge&#39;s z-index value.   default: 0</span>
      bringToFrontOnHover<span class="token operator">:</span> <span class="token builtin">boolean</span>    <span class="token comment">// whether to bring to front on hover.    default: true</span>
      bringToFrontOnSelected<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token comment">// whether to bring to front on selected. default: true</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span>
  path<span class="token operator">:</span> <span class="token punctuation">{</span>
    visible<span class="token operator">:</span> <span class="token builtin">boolean</span>     <span class="token comment">// whether the paths are visible or not.  default: false</span>
    clickable<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token operator">|</span> <span class="token punctuation">(</span>path<span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token builtin">boolean</span>  <span class="token comment">// whether paths are clickable or not. default: false</span>
    hoverable<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token operator">|</span> <span class="token punctuation">(</span>path<span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token builtin">boolean</span>  <span class="token comment">// whether paths are hoverable or not. default: false</span>
    selectable<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token operator">|</span> <span class="token builtin">number</span> <span class="token operator">|</span> <span class="token punctuation">(</span>path<span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token builtin">boolean</span>
        <span class="token comment">// whether the path is selectable or not. default: false</span>
        <span class="token comment">// When specified as a number, it means the max number of paths that can be selected.</span>
    curveInNode<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token comment">// whether to curve paths within nodes.   default: false</span>
    end<span class="token operator">:</span> <span class="token string">&quot;centerOfNode&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;edgeOfNode&quot;</span> <span class="token comment">// position of end of path. default: &quot;centerOfNode&quot;</span>
    margin<span class="token operator">:</span> <span class="token builtin">number</span>       <span class="token comment">// margin from end of path.               default: 0</span>
    path<span class="token operator">:</span> <span class="token punctuation">{</span> <span class="token comment">/* @deprecated */</span> <span class="token punctuation">}</span>
    normal<span class="token operator">:</span> <span class="token punctuation">{</span>
      <span class="token comment">// * These fields can also be specified with the function as \`(path) =&gt; value\`.</span>
      width<span class="token operator">:</span> <span class="token builtin">number</span>      <span class="token comment">// width of path. default: 6</span>
      color<span class="token operator">:</span> <span class="token builtin">string</span>      <span class="token comment">// path color. default: (Func to select a color from a hash of edges.)</span>
      dasharray<span class="token operator">:</span> <span class="token builtin">number</span> <span class="token operator">|</span> <span class="token builtin">string</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>         <span class="token comment">// stroke dash array. default: undefined</span>
      linecap<span class="token operator">:</span> <span class="token string">&quot;butt&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;round&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;square&quot;</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>  <span class="token comment">// stroke linecap. default: &quot;round&quot;</span>
      linejoin<span class="token operator">:</span> <span class="token string">&quot;miter&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;round&quot;</span> <span class="token operator">|</span> <span class="token string">&quot;bevel&quot;</span>            <span class="token comment">// stroke linejoin. default: &quot;round&quot;</span>
      animate<span class="token operator">:</span> <span class="token builtin">boolean</span>                       <span class="token comment">// whether to animate or not. default: false</span>
      animationSpeed<span class="token operator">:</span> <span class="token builtin">number</span>                  <span class="token comment">// animation speed.           default: 50</span>
    <span class="token punctuation">}</span>
    hover<span class="token operator">:</span> <span class="token punctuation">{</span> <span class="token comment">/* same structure as \`normal\`. */</span> <span class="token punctuation">}</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>
        <span class="token comment">// default: {</span>
        <span class="token comment">//   width: () =&gt; {normal&#39;s value} + 2</span>
        <span class="token comment">//   ... all other values are same as \`path.normal\`</span>
        <span class="token comment">// },</span>
    selected<span class="token operator">:</span> <span class="token punctuation">{</span> <span class="token comment">/* same structure as \`normal\`. */</span> <span class="token punctuation">}</span>
        <span class="token comment">// default: {</span>
        <span class="token comment">//   width: () =&gt; {normal&#39;s value} + 2</span>
        <span class="token comment">//   dasharray: &quot;6 12&quot;,</span>
        <span class="token comment">//   ... all other values are same as \`path.normal\`</span>
        <span class="token comment">// }</span>
    zOrder<span class="token operator">:</span> <span class="token punctuation">{</span>
      enabled<span class="token operator">:</span> <span class="token builtin">boolean</span>  <span class="token comment">// whether the z-order control is enable or not. default: false</span>
      zIndex<span class="token operator">:</span> <span class="token builtin">number</span> <span class="token operator">|</span> <span class="token punctuation">(</span>node<span class="token operator">:</span> Node<span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token builtin">number</span> <span class="token comment">// path&#39;s z-index value.   default: 0</span>
      bringToFrontOnHover<span class="token operator">:</span> <span class="token builtin">boolean</span>    <span class="token comment">// whether to bring to front on hover.    default: true</span>
      bringToFrontOnSelected<span class="token operator">:</span> <span class="token builtin">boolean</span> <span class="token comment">// whether to bring to front on selected. default: true</span>
    <span class="token punctuation">}</span>
    transition<span class="token operator">:</span> <span class="token builtin">string</span> <span class="token operator">|</span> <span class="token keyword">undefined</span>  <span class="token comment">// entering/leaving transition. default: undefined</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers-wrapper"><span class="line-number">1</span><br><span class="line-number">2</span><br><span class="line-number">3</span><br><span class="line-number">4</span><br><span class="line-number">5</span><br><span class="line-number">6</span><br><span class="line-number">7</span><br><span class="line-number">8</span><br><span class="line-number">9</span><br><span class="line-number">10</span><br><span class="line-number">11</span><br><span class="line-number">12</span><br><span class="line-number">13</span><br><span class="line-number">14</span><br><span class="line-number">15</span><br><span class="line-number">16</span><br><span class="line-number">17</span><br><span class="line-number">18</span><br><span class="line-number">19</span><br><span class="line-number">20</span><br><span class="line-number">21</span><br><span class="line-number">22</span><br><span class="line-number">23</span><br><span class="line-number">24</span><br><span class="line-number">25</span><br><span class="line-number">26</span><br><span class="line-number">27</span><br><span class="line-number">28</span><br><span class="line-number">29</span><br><span class="line-number">30</span><br><span class="line-number">31</span><br><span class="line-number">32</span><br><span class="line-number">33</span><br><span class="line-number">34</span><br><span class="line-number">35</span><br><span class="line-number">36</span><br><span class="line-number">37</span><br><span class="line-number">38</span><br><span class="line-number">39</span><br><span class="line-number">40</span><br><span class="line-number">41</span><br><span class="line-number">42</span><br><span class="line-number">43</span><br><span class="line-number">44</span><br><span class="line-number">45</span><br><span class="line-number">46</span><br><span class="line-number">47</span><br><span class="line-number">48</span><br><span class="line-number">49</span><br><span class="line-number">50</span><br><span class="line-number">51</span><br><span class="line-number">52</span><br><span class="line-number">53</span><br><span class="line-number">54</span><br><span class="line-number">55</span><br><span class="line-number">56</span><br><span class="line-number">57</span><br><span class="line-number">58</span><br><span class="line-number">59</span><br><span class="line-number">60</span><br><span class="line-number">61</span><br><span class="line-number">62</span><br><span class="line-number">63</span><br><span class="line-number">64</span><br><span class="line-number">65</span><br><span class="line-number">66</span><br><span class="line-number">67</span><br><span class="line-number">68</span><br><span class="line-number">69</span><br><span class="line-number">70</span><br><span class="line-number">71</span><br><span class="line-number">72</span><br><span class="line-number">73</span><br><span class="line-number">74</span><br><span class="line-number">75</span><br><span class="line-number">76</span><br><span class="line-number">77</span><br><span class="line-number">78</span><br><span class="line-number">79</span><br><span class="line-number">80</span><br><span class="line-number">81</span><br><span class="line-number">82</span><br><span class="line-number">83</span><br><span class="line-number">84</span><br><span class="line-number">85</span><br><span class="line-number">86</span><br><span class="line-number">87</span><br><span class="line-number">88</span><br><span class="line-number">89</span><br><span class="line-number">90</span><br><span class="line-number">91</span><br><span class="line-number">92</span><br><span class="line-number">93</span><br><span class="line-number">94</span><br><span class="line-number">95</span><br><span class="line-number">96</span><br><span class="line-number">97</span><br><span class="line-number">98</span><br><span class="line-number">99</span><br><span class="line-number">100</span><br><span class="line-number">101</span><br><span class="line-number">102</span><br><span class="line-number">103</span><br><span class="line-number">104</span><br><span class="line-number">105</span><br><span class="line-number">106</span><br><span class="line-number">107</span><br><span class="line-number">108</span><br><span class="line-number">109</span><br><span class="line-number">110</span><br><span class="line-number">111</span><br><span class="line-number">112</span><br><span class="line-number">113</span><br><span class="line-number">114</span><br><span class="line-number">115</span><br><span class="line-number">116</span><br><span class="line-number">117</span><br><span class="line-number">118</span><br><span class="line-number">119</span><br><span class="line-number">120</span><br><span class="line-number">121</span><br><span class="line-number">122</span><br><span class="line-number">123</span><br><span class="line-number">124</span><br><span class="line-number">125</span><br><span class="line-number">126</span><br><span class="line-number">127</span><br><span class="line-number">128</span><br><span class="line-number">129</span><br><span class="line-number">130</span><br><span class="line-number">131</span><br><span class="line-number">132</span><br><span class="line-number">133</span><br><span class="line-number">134</span><br><span class="line-number">135</span><br><span class="line-number">136</span><br><span class="line-number">137</span><br><span class="line-number">138</span><br><span class="line-number">139</span><br><span class="line-number">140</span><br><span class="line-number">141</span><br><span class="line-number">142</span><br><span class="line-number">143</span><br><span class="line-number">144</span><br><span class="line-number">145</span><br><span class="line-number">146</span><br><span class="line-number">147</span><br><span class="line-number">148</span><br><span class="line-number">149</span><br><span class="line-number">150</span><br><span class="line-number">151</span><br><span class="line-number">152</span><br><span class="line-number">153</span><br><span class="line-number">154</span><br><span class="line-number">155</span><br><span class="line-number">156</span><br><span class="line-number">157</span><br><span class="line-number">158</span><br><span class="line-number">159</span><br><span class="line-number">160</span><br><span class="line-number">161</span><br><span class="line-number">162</span><br><span class="line-number">163</span><br><span class="line-number">164</span><br><span class="line-number">165</span><br><span class="line-number">166</span><br><span class="line-number">167</span><br><span class="line-number">168</span><br><span class="line-number">169</span><br><span class="line-number">170</span><br><span class="line-number">171</span><br><span class="line-number">172</span><br><span class="line-number">173</span><br><span class="line-number">174</span><br><span class="line-number">175</span><br><span class="line-number">176</span><br><span class="line-number">177</span><br><span class="line-number">178</span><br><span class="line-number">179</span><br><span class="line-number">180</span><br><span class="line-number">181</span><br><span class="line-number">182</span><br><span class="line-number">183</span><br><span class="line-number">184</span><br><span class="line-number">185</span><br><span class="line-number">186</span><br><span class="line-number">187</span><br><span class="line-number">188</span><br><span class="line-number">189</span><br><span class="line-number">190</span><br><span class="line-number">191</span><br><span class="line-number">192</span><br><span class="line-number">193</span><br><span class="line-number">194</span><br><span class="line-number">195</span><br><span class="line-number">196</span><br><span class="line-number">197</span><br><span class="line-number">198</span><br><span class="line-number">199</span><br><span class="line-number">200</span><br><span class="line-number">201</span><br><span class="line-number">202</span><br><span class="line-number">203</span><br><span class="line-number">204</span><br><span class="line-number">205</span><br><span class="line-number">206</span><br><span class="line-number">207</span><br><span class="line-number">208</span><br><span class="line-number">209</span><br><span class="line-number">210</span><br><span class="line-number">211</span><br><span class="line-number">212</span><br><span class="line-number">213</span><br><span class="line-number">214</span><br><span class="line-number">215</span><br><span class="line-number">216</span><br><span class="line-number">217</span><br><span class="line-number">218</span><br><span class="line-number">219</span><br><span class="line-number">220</span><br><span class="line-number">221</span><br><span class="line-number">222</span><br><span class="line-number">223</span><br><span class="line-number">224</span><br><span class="line-number">225</span><br><span class="line-number">226</span><br><span class="line-number">227</span><br><span class="line-number">228</span><br><span class="line-number">229</span><br><span class="line-number">230</span><br><span class="line-number">231</span><br><span class="line-number">232</span><br><span class="line-number">233</span><br><span class="line-number">234</span><br><span class="line-number">235</span><br><span class="line-number">236</span><br><span class="line-number">237</span><br><span class="line-number">238</span><br><span class="line-number">239</span><br><span class="line-number">240</span><br><span class="line-number">241</span><br><span class="line-number">242</span><br><span class="line-number">243</span><br><span class="line-number">244</span><br><span class="line-number">245</span><br><span class="line-number">246</span><br><span class="line-number">247</span><br><span class="line-number">248</span><br><span class="line-number">249</span><br><span class="line-number">250</span><br><span class="line-number">251</span><br><span class="line-number">252</span><br><span class="line-number">253</span><br><span class="line-number">254</span><br><span class="line-number">255</span><br><span class="line-number">256</span><br><span class="line-number">257</span><br><span class="line-number">258</span><br><span class="line-number">259</span><br><span class="line-number">260</span><br><span class="line-number">261</span><br><span class="line-number">262</span><br><span class="line-number">263</span><br><span class="line-number">264</span><br><span class="line-number">265</span><br><span class="line-number">266</span><br><span class="line-number">267</span><br><span class="line-number">268</span><br><span class="line-number">269</span><br><span class="line-number">270</span><br><span class="line-number">271</span><br><span class="line-number">272</span><br><span class="line-number">273</span><br><span class="line-number">274</span><br><span class="line-number">275</span><br><span class="line-number">276</span><br><span class="line-number">277</span><br><span class="line-number">278</span><br><span class="line-number">279</span><br></div></div></div>`,3),o=[t];function l(r,c,i,u,m,b){return a(),s("div",null,o)}var h=n(p,[["render",l]]);export{f as __pageData,h as default};
