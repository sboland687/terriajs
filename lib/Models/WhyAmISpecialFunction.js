'use strict';

/*global require*/
var CatalogFunction = require('./CatalogFunction');
var defined = require('terriajs-cesium/Source/Core/defined');
var defineProperties = require('terriajs-cesium/Source/Core/defineProperties');
var inherit = require('../Core/inherit');
var loadWithXhr = require('terriajs-cesium/Source/Core/loadWithXhr');
var ModelError = require('../Models/ModelError');
var RegionProviderList = require('../Map/RegionProviderList');

var WhyAmISpecialFunction = function(terria) {
    CatalogFunction.call(this, terria);

    this.name = "Why is a given region unique or special?";
    this.description = "Determines the characteristics by which a particular region is _most different_ from all other regions.";
};

inherit(CatalogFunction, WhyAmISpecialFunction);

defineProperties(WhyAmISpecialFunction.prototype, {
    /**
     * Gets the type of data member represented by this instance.
     * @memberOf WhyAmISpecialFunction.prototype
     * @type {String}
     */
    type : {
        get : function() {
            return 'why-am-i-special-function';
        }
    },

    /**
     * Gets a human-readable name for this type of data source, 'Why Am I Special?'.
     * @memberOf WhyAmISpecialFunction.prototype
     * @type {String}
     */
    typeName : {
        get : function() {
            return 'Why Am I Special?';
        }
    },

    /**
     * Gets the parameters used to {@link CatalogProcess#invoke} to this function.
     * @memberOf WhyAmISpecialFunction
     * @type {CatalogProcessParameters[]}
     */
    parameters : {
        get : function() {
            return [
                {
                    id: "regionType",
                    name: "Region Type",
                    description: "The type of region to analyze.",
                    type: "regionType"
                },
                {
                    id: "region",
                    name: "Region",
                    description: "The region to analyze.  The analysis will determine the characteristics by which this region is most different from all others.",
                    type: "region",
                    regionType: {
                        parameter: "regionType"
                    }
                },
                {
                    id: "includeBasicCommunityProfile",
                    name: "Include characteristics from the Basic Community Profile",
                    description: "Whether to include the characteristics in the Basic Community Profile of the most recent Census among the characteristics to analyze.",
                    type: "bool",
                    defaultValue: true
                },
                {
                    id: "data",
                    name: "Additional Characteristics",
                    description: "Additional region characteristics to include in the analysis.",
                    type: "regionData",
                    regionType: {
                        parameter: "regionType"
                    }
                }
            ];
        }
    }
});

/**
 * Invokes the process.
 * @param {Object} parameters The parameters to the process.  Each required parameter in {@link CatalogProcess#parameters} must have a corresponding key in this object.
 * @return {AsyncProcessResultCatalogItem} The result of invoking this process.  Because the process typically proceeds asynchronously, the result is a temporary
 *         catalog item that resolves to the real one once the process finishes.
 */
WhyAmISpecialFunction.prototype.invoke = function(parameters) {
    return RegionProviderList.fromUrl(this.terria.regionMappingDefinitionsUrl).then(function(regionProviderList) {
        var regionProvider = regionProviderList.regionProviders.filter(function(regionProvider) {
            return regionProvider.regionType === parameters.regionType;
        })[0];
        if (!defined(regionProvider)) {
            throw new ModelError({
                title: 'No matching region provider',
                message: 'Could not find a matching region provider for region type "' + parameters.regionType + '".'
            });
        }

        var regionCodes = [];
        var regionCodeHash = {};
        var columns = [];

        var columnData;
        var regions;
        var values;
        var regionRow;

        for (var columnName in parameters.data) {
            if (parameters.data.hasOwnProperty(columnName)) {
                columns.push(columnName);

                columnData = parameters.data[columnName];
                regions = columnData.regions;
                values = columnData.values;

                for (var i = 0; i < regions.length; ++i) {
                    regionRow = regionCodeHash[regions[i]];
                    if (!defined(regionRow)) {
                        regionRow = regionCodeHash[regions[i]] = regionCodes.length;
                        regionCodes.push(regions[i]);
                    }
                }
            }
        }

        // var table = [];
        // for (var rowIndex = 0; rowIndex < regionCodes.length; ++rowIndex) {
        //     regionRow = regionCodeHash[regions[rowIndex]];
        //     var row = table[regionRow];
        //     if (!defined(row)) {
        //         row = table[regionRow] = [];
        //     }

        //     for (var columnIndex = 0; columnIndex < columns.length; ++columnIndex) {
        //         columnData = parameters.data[columns[columnIndex]];
        //         regions = columnData.regions;
        //         values = columnData.values;
        //         row[columnIndex] =
        //     }
        //     table.push(row);
        // }

        var table = [];
        for (var columnIndex = 0; columnIndex < columns.length; ++columnIndex) {
            columnData = parameters.data[columns[columnIndex]];
            regions = columnData.regions;
            values = columnData.values;

            for (var rowIndex = 0; rowIndex < regionCodes.length; ++rowIndex) {
                regionRow = regionCodeHash[regions[rowIndex]];
                var row = table[regionRow];
                if (!defined(row)) {
                    row = table[regionRow] = [];
                }
                row[columnIndex] = values[rowIndex] || 0.0; // are null/undefined values allowed by the service?
            }
        }

        // var table = [];
        // for (var columnIndex = 0; columnIndex < columns.length; ++columnIndex) {
        //     columnData = parameters.data[columns[columnIndex]];
        //     regions = columnData.regions;
        //     values = columnData.values;

        //     var tableColumn = table[columnIndex] = [];

        //     for (var rowIndex = 0; rowIndex < regionCodes.length; ++rowIndex) {
        //         regionRow = regionCodeHash[regions[rowIndex]];
        //         tableColumn[regionRow] = values[rowIndex] || 0.0; // are null/undefined values allowed by the service?
        //     }
        // }

        var request = {
            algorithm: 'whyamispecial',
            boundaries_name: parameters.regionType,
            region_codes: regionCodes,
            columns: columns,
            table: table,
            parameters: {
                query: parameters.region | 0,
                param2: 0.5
            }
        };

        return loadWithXhr({
            url: 'http://127.0.0.1:31113/jobs',
            method: 'POST',
            data: JSON.stringify(request)
        }).then(function(response) {
            console.log(response);
        });
    });
};

module.exports = WhyAmISpecialFunction;