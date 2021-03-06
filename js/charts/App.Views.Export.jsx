/* owid.component.staticExport.js
 * ================
 *
 * This component is responsible for getting the chart into a nice state for phantomjs
 * to take a PNG screenshot, and serializing the SVG for export.
 *
 * @project Our World In Data
 * @author  Jaiden Mispy
 * @created 2016-08-09
 */

import _ from 'lodash'
import Bounds from './Bounds'
import owid from '../owid'
import {svgAsDataUri} from './saveSvgAsPng'
import $ from 'jquery'

export default function(chart) {
    let callPhantom = window.callPhantom || console.log

	d3.select('body').classed('export', true);

	var params = owid.getQueryParams(),
		targetWidth = params.size && params.size.split("x") ? parseInt(params.size.split("x")[0]) : App.IDEAL_WIDTH,
		targetHeight = params.size && params.size.split("x") ? parseInt(params.size.split("x")[1]) : App.IDEAL_HEIGHT;

	chart.update({
		outerBounds: new Bounds(0, 0, targetWidth, targetHeight)
	});

	chart.dispatch.on('renderEnd', function() {
		setTimeout(function() {
			// Remove SVG UI elements that aren't needed for export
            const svg = d3.select(chart.svgNode)
			svg.selectAll(".nv-add-btn, .nv-controlsWrap").remove();

			callPhantom({ targetWidth: targetWidth, targetHeight: targetHeight }); // Notify phantom that we're ready for PNG screenshot
			prepareSVGForExport(svg);

		}.bind(this), 100);
	}.bind(this));

	function prepareSVGForExport(svg) {
		// Inline the CSS styles, since the exported SVG won't have a stylesheet
		var styleSheets = document.styleSheets;
		var elems = [];
		_.each(document.styleSheets, function(styleSheet) {
			_.each(styleSheet.cssRules, function(rule) {
				try {
					$(rule.selectorText).each(function(i, elem) {
						if (!elem.origStyle && !elem.hasChangedStyle) {
							elem.origStyle = elem.style.cssText;
							elem.style.cssText = "";
							elems.push(elem);
						}

						if ($(elem).parent().closest("svg").length) {
							elem.style.cssText += rule.style.cssText;
							elem.hasChangedStyle = true;
						}
					});
				} catch (e) {}
			});
		});

		_.each(elems, function(elem) {
			if (elem.origStyle)
				elem.style.cssText += elem.origStyle;
		});

		// MISPY: Need to propagate a few additional styles from the external document into the SVG
		svg.style("font-family", chart.el.style("font-family"));
		svg.style("width", chart.el.style("width"));
		svg.style("height", chart.el.style("height"));
		svg.style("font-size", svg.style("font-size"));
        svg.style("background-color", "#fff")

        // Remove all other styles for easier testing that this works
        //d3.selectAll('link').remove()

		svgAsDataUri(svg.node(), {}, function(uri) {
			var svgData = uri.substring('data:image/svg+xml;base64,'.length);
			callPhantom({ "svg": svgData });
		});
	}
};
