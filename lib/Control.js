"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const leaflet_1 = __importDefault(require("leaflet"));
const Util_1 = __importDefault(require("./Util"));
const marker_1 = require("./marker");
const Leaflet_StyleEditor_1 = require("./Leaflet.StyleEditor");
const StyleForm_1 = __importDefault(require("./StyleForm"));
class StyleEditorControl extends leaflet_1.default.Control {
    constructor(options = defaultOptions) {
        super();
        this.util = Util_1.default.getInstance();
        this.styleEditor = new Leaflet_StyleEditor_1.StyleEditor();
        //this.styleEditor.setOptions(options)
        this.options = options;
    }
    onAdd(map) {
        this.styleEditor.map = map;
        return this.createUi();
    }
    fireEvent(eventName, element) {
        this.util.fireEvent(eventName, element);
    }
    createUi() {
        this.controlDiv = leaflet_1.default.DomUtil.create('div', 'leaflet-control-styleeditor leaflet-control leaflet-bar');
        this.controlUI = leaflet_1.default.DomUtil.create('a', 'leaflet-control-styleeditor-interior', this.controlDiv);
        this.controlUI.title = 'Style Editor';
        this.cancelUI = leaflet_1.default.DomUtil.create('div', 'leaflet-control-styleeditor-cancel leaflet-styleeditor-hidden', this.controlDiv);
        this.cancelUI.innerHTML = this.styleEditor.options.strings.cancel;
        this.cancelUI.title = this.styleEditor.options.strings.cancelTitle;
        this.styleEditorDiv = leaflet_1.default.DomUtil.create('div', 'leaflet-styleeditor', this.styleEditor.map.getContainer);
        this.styleEditorHeader = leaflet_1.default.DomUtil.create('div', 'leaflet-styleeditor-header', this.styleEditorDiv);
        this.styleEditorInterior = leaflet_1.default.DomUtil.create('div', 'leaflet-styleeditor-interior', this.styleEditorDiv);
        this.addDomEvents();
        this.addEventListeners();
        this.addButtons();
        this.styleForm = new StyleForm_1.default({
            styleEditorDiv: this.styleEditorDiv,
            styleEditorInterior: this.styleEditorInterior,
        });
        return this.controlDiv;
    }
    addDomEvents() {
        leaflet_1.default.DomEvent.disableScrollPropagation(this.styleEditorDiv);
        leaflet_1.default.DomEvent.disableScrollPropagation(this.controlDiv);
        leaflet_1.default.DomEvent.disableScrollPropagation(this.cancelUI);
        leaflet_1.default.DomEvent.disableClickPropagation(this.styleEditorDiv);
        leaflet_1.default.DomEvent.disableClickPropagation(this.controlDiv);
        leaflet_1.default.DomEvent.disableClickPropagation(this.cancelUI);
        leaflet_1.default.DomEvent.on(this.controlDiv, 'click', function () {
            this.toggle();
        }, this);
    }
    addEventListeners() {
        this.addLeafletDrawEvents();
        this.addLeafletEditableEvents();
    }
    addLeafletDrawEvents() {
        if (!this.options.openOnLeafletDraw || !leaflet_1.default.Control.Draw) {
            return;
        }
        this.styleEditor.map.on('layeradd', this.onLayerAdd, this);
        this.styleEditor.map.on(leaflet_1.default.Draw.Event.CREATED, this.onLayerCreated, this);
    }
    addLeafletEditableEvents() {
        if (!this.options.openOnLeafletEditable || !leaflet_1.default.Editable) {
            return;
        }
        this.styleEditor.map.on('layeradd', this.onLayerAdd, this);
        this.styleEditor.map.on('editable:created', this.onLayerCreated, this);
    }
    onLayerCreated(layer) {
        this.removeIndicators();
        this.styleEditor.currentElement = layer.layer;
    }
    onLayerAdd(e) {
        if (this.styleEditor.currentElement) {
            if (e.layer === this.util.getCurrentElement()) {
                this.enable(e.layer);
            }
        }
    }
    onRemove() {
        // hide everything that may be visible
        // remove edit events for layers
        // remove tooltip
        this.disable();
        // remove events
        this.removeDomEvents();
        this.removeEventListeners();
        // remove dom elements
        leaflet_1.default.DomUtil.remove(this.styleEditorDiv);
        leaflet_1.default.DomUtil.remove(this.cancelUI);
        // delete dom elements
        delete this.styleEditorDiv;
        delete this.cancelUI;
    }
    removeEventListeners() {
        this.styleEditor.map.off('layeradd', this.onLayerAdd);
        if (leaflet_1.default.Draw) {
            this.styleEditor.map.off(leaflet_1.default.Draw.Event.CREATED, this.onLayerCreated);
        }
        if (leaflet_1.default.Editable) {
            this.styleEditor.map.off('editable:created', this.onLayerCreated);
        }
    }
    removeDomEvents() {
        leaflet_1.default.DomEvent.off(this.controlDiv, 'click', function () {
            this.toggle();
        }, this);
    }
    addButtons() {
        let nextBtn = leaflet_1.default.DomUtil.create('button', 'leaflet-styleeditor-button styleeditor-nextBtn', this.styleEditorHeader);
        nextBtn.title = this.options.strings.tooltipNext;
        leaflet_1.default.DomEvent.on(nextBtn, 'click', function (e) {
            this.hideEditor();
            if (leaflet_1.default.DomUtil.hasClass(this.controlUI, 'enabled')) {
                this.createTooltip();
            }
            e.stopPropagation();
        }, this);
    }
    toggle() {
        if (leaflet_1.default.DomUtil.hasClass(this.controlUI, 'enabled')) {
            this.disable();
        }
        else {
            this.enable();
        }
    }
    enable(layer) {
        if (this._layerIsIgnored(layer)) {
            return;
        }
        leaflet_1.default.DomUtil.addClass(this.controlUI, 'enabled');
        this.styleEditor.map.eachLayer(this.addEditClickEvents, this);
        this.showCancelButton();
        this.createTooltip();
        if (layer !== undefined) {
            if (this.isEnabled()) {
                this.removeIndicators();
            }
            this.initChangeStyle({ target: layer });
        }
    }
    isEnabled() {
        return leaflet_1.default.DomUtil.hasClass(this.controlUI, 'enabled');
    }
    disable() {
        if (this.isEnabled()) {
            this.editLayers.forEach(this.removeEditClickEvents, this);
            this.editLayers = [];
            this.layerGroups = [];
            this.hideEditor();
            this.hideCancelButton();
            this.removeTooltip();
            leaflet_1.default.DomUtil.removeClass(this.controlUI, 'enabled');
        }
    }
    addEditClickEvents(layer) {
        if (this._layerIsIgnored(layer)) {
            return;
        }
        if (this.options.useGrouping && layer instanceof leaflet_1.default.LayerGroup) {
            this.layerGroups.push(layer);
        }
        else if (layer instanceof leaflet_1.default.Marker || layer instanceof leaflet_1.default.Path) {
            let evt = layer.on('click', this.initChangeStyle, this);
            this.editLayers.push(evt);
        }
    }
    removeEditClickEvents(layer) {
        layer.off('click', this.initChangeStyle, this);
    }
    addIndicators() {
        if (!this.styleEditor.currentElement) {
            return;
        }
        let currentElement = this.styleEditor.currentElement.target;
        if (currentElement instanceof leaflet_1.default.LayerGroup) {
            currentElement.eachLayer(function (layer) {
                if (layer instanceof leaflet_1.default.Marker && layer.getElement()) {
                    leaflet_1.default.DomUtil.addClass(layer.getElement(), 'leaflet-styleeditor-marker-selected');
                }
            });
        }
        else if (currentElement instanceof leaflet_1.default.Marker) {
            if (currentElement.getElement()) {
                leaflet_1.default.DomUtil.addClass(currentElement.getElement(), 'leaflet-styleeditor-marker-selected');
            }
        }
    }
    removeIndicators() {
        if (!this.styleEditor.currentElement) {
            return;
        }
        let currentElement = this.util.getCurrentElement();
        if (currentElement instanceof leaflet_1.default.LayerGroup) {
            currentElement.eachLayer(function (layer) {
                //TODO
                const anything = layer;
                if (anything.getElement()) {
                    leaflet_1.default.DomUtil.removeClass(anything.getElement(), 'leaflet-styleeditor-marker-selected');
                }
            });
        }
        else {
            if (currentElement.getElement()) {
                leaflet_1.default.DomUtil.removeClass(currentElement.getElement(), 'leaflet-styleeditor-marker-selected');
            }
        }
    }
    hideEditor() {
        if (leaflet_1.default.DomUtil.hasClass(this.styleEditorDiv, 'editor-enabled')) {
            this.removeIndicators();
            leaflet_1.default.DomUtil.removeClass(this.styleEditorDiv, 'editor-enabled');
            this.fireEvent('hidden');
        }
    }
    hideCancelButton() {
        leaflet_1.default.DomUtil.addClass(this.cancelUI, 'leaflet-styleeditor-hidden');
    }
    showEditor() {
        let editorDiv = this.styleEditorDiv;
        if (!leaflet_1.default.DomUtil.hasClass(editorDiv, 'editor-enabled')) {
            leaflet_1.default.DomUtil.addClass(editorDiv, 'editor-enabled');
            this.fireEvent('visible');
        }
    }
    showCancelButton() {
        leaflet_1.default.DomUtil.removeClass(this.cancelUI, 'leaflet-styleeditor-hidden');
    }
    initChangeStyle(e) {
        this.removeIndicators();
        this.styleEditor.currentElement = (this.options.useGrouping) ? this.getMatchingElement(e) : e;
        this.addIndicators();
        this.showEditor();
        this.removeTooltip();
        let layer = e;
        if (!(layer instanceof leaflet_1.default.Layer)) {
            layer = e.target;
        }
        this.fireEvent('editing', layer);
        if (layer instanceof leaflet_1.default.Marker) {
            // ensure iconOptions are set for Leaflet.Draw created Markers
            this.options.markerType.resetIconOptions();
            // marker
            this.showMarkerForm(layer);
        }
        else {
            // layer with of type L.GeoJSON or L.Path (polyline, polygon, ...)
            this.showGeometryForm(layer);
        }
    }
    showGeometryForm(layer) {
        this.fireEvent('geometry', layer);
        this.styleForm.showGeometryForm();
    }
    showMarkerForm(layer) {
        this.fireEvent('marker', layer);
        this.styleForm.showMarkerForm();
    }
    createTooltip() {
        if (!this.options.showTooltip) {
            return;
        }
        if (!this.tooltipWrapper) {
            this.tooltipWrapper =
                leaflet_1.default.DomUtil.create('div', 'leaflet-styleeditor-tooltip-wrapper', this.styleEditor.map.getContainer());
        }
        if (!this.tooltip) {
            this.tooltip = leaflet_1.default.DomUtil.create('div', 'leaflet-styleeditor-tooltip', this.tooltipWrapper);
        }
        this.tooltip.innerHTML = this.options.strings.tooltip;
    }
    getMatchingElement(e) {
        let group = null;
        let layer = e.target;
        for (let i = 0; i < this.layerGroups.length; ++i) {
            group = this.layerGroups[i];
            if (group && layer !== group && group.hasLayer(layer)) {
                // we use the opacity style to check for correct object
                if (!group.options || !group.options.opacity) {
                    group.options = layer.options;
                    // special handling for layers... we pass the setIcon function
                    if (layer.setIcon) {
                        group.setIcon = function (icon) {
                            group.eachLayer(function (layer) {
                                if (layer instanceof leaflet_1.default.Marker) {
                                    layer.setIcon(icon);
                                }
                            });
                        };
                    }
                }
                return this.getMatchingElement({
                    target: group
                });
            }
        }
        return e;
    }
    removeTooltip() {
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.remove();
            this.tooltip = undefined;
        }
    }
    _layerIsIgnored(layer) {
        if (layer === undefined) {
            return false;
        }
        return this.options.ignoreLayerTypes.some(layerType => layer.styleEditor && layer.styleEditor.type.toUpperCase() === layerType.toUpperCase());
    }
}
leaflet_1.default.control.styleEditor = function (options) {
    if (!options) {
        options = {};
    }
    return new leaflet_1.default.Control.StyleEditor(options);
};
const defaultOptions = {
    position: 'topleft',
    colorRamp: ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e', '#16a085', '#27ae60', '#2980b9', '#8e44ad',
        '#2c3e50', '#f1c40f', '#e67e22', '#e74c3c', '#ecf0f1', '#95a5a6', '#f39c12', '#d35400', '#c0392b',
        '#bdc3c7', '#7f8c8d'],
    defaultColor: null,
    markers: null,
    defaultMarkerIcon: null,
    defaultMarkerColor: null,
    ignoreLayerTypes: [],
    openOnLeafletDraw: true,
    openOnLeafletEditable: true,
    showTooltip: true,
    strings: {
        cancel: 'Cancel',
        cancelTitle: 'Cancel Styling',
        tooltip: 'Click on the element you want to style',
        tooltipNext: 'Choose another element you want to style'
    },
    useGrouping: true,
    forms: {},
    styleEditorEventPrefix: 'styleeditor:',
    markerType: new marker_1.DefaultMarker(this.styleEditor)
};