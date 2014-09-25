﻿(function ($) {
    angular.module('selectors')
        .directive('taxonFilter', function () {
            return {
                restrict: 'EA',
                scope: {
                    taxonomyFields: '=',
                    taxonFilters: '=',
                    selectedTaxonomies: '=',
                    provider: '=?'
                },
                templateUrl: function (elem, attrs) {
                    var assembly = attrs.templateAssembly || 'Telerik.Sitefinity.Frontend';
                    var url = attrs.templateUrl || 'Selectors/taxon-filter.html';
                    return sitefinity.getEmbeddedResourceUrl(assembly, url);
                },
                link: {
                    pre: function (scope, element, attrs, ctrl) {
                        scope.toggleTaxonomySelection = function (taxonomyName) {
                            if (!scope.selectedTaxonomies)
                                scope.selectedTaxonomies = [];

                            var idx = scope.selectedTaxonomies.indexOf(taxonomyName);

                            // is currently selected
                            if (idx > -1) {
                                scope.selectedTaxonomies.splice(idx, 1);

                                delete scope.taxonFilters[taxonomyName];
                            }

                                // is newly selected
                            else {
                                scope.selectedTaxonomies.push(taxonomyName);
                                
                                if (!scope.taxonFilters[taxonomyName])
                                    scope.taxonFilters[taxonomyName] = [];
                            }
                        };
                    }
                }
            };
        });
})(jQuery);