﻿; (function () {

    /*
     * Libraries service provides services for working with images, documents and videos in Sitefinity.
     */
    var librariesService = angular.module('sfLibrariesService', ['services', 'serverDataModule']);

    /*
     * Image Service provides functionality for working with Sitefinity Images.
     */
    librariesService.factory('sfImageService', ['$http', '$interpolate', '$q', 'serverData', function ($http, $interpolate, $q, serverData) {

        var imageServiceUrl = '/Sitefinity/Services/Content/ImageService.svc/',
            itemTypeKey = 'itemType',
            imageItemType = 'Telerik.Sitefinity.Libraries.Model.Image',
            skipKey = 'skip',
            takeKey = 'take',
            filterKey = 'filter',
            sortKey = 'sortExpression';

        var emptyGuid = '00000000-0000-0000-0000-000000000000',
            defaultAlbumId = '4ba7ad46-f29b-4e65-be17-9bf7ce5ba1fb', // TODO: hardcoded until I make album selector
            uploadUrl = '/Telerik.Sitefinity.Html5UploadHandler.ashx',
            imageUrl = '/Sitefinity/Services/Content/ImageService.svc/',
            createImageUrl = imageUrl + 'parent/{{libraryId}}/{{itemId}}/?itemType={{itemType}}&provider={{provider}}&parentItemType={{parentItemType}}&newParentId={{newParentId}}',
            albumItemType = 'Telerik.Sitefinity.Libraries.Model.Album';

        // generates the url for the image service for a specific image
        var createImageServiceUrl = function (file) {

            var settings = {
                libraryId: defaultAlbumId,
                itemId: emptyGuid,
                itemType: imageItemType,
                provider: '',
                parentItemType: albumItemType,
                newParentId: defaultAlbumId
            };

            return $interpolate(createImageUrl)(settings);

        };

        var getImagesServiceUrl = function (settings) {

            var page = settings.page || 0,
                pageSize = 24,
                skip = pageSize * page;

            var url = imageUrl;
            url += '?itemType=' + imageItemType;
            url += '&skip=' + skip;
            url += '&take=' + pageSize;
            url += '&filter=[ShowRecentLiveItems]';
            return url;
        };

        // creates a new Sitefinity image content item
        var createImage = function (file) {

            var now = new Date(),
                url = createImageServiceUrl(file),
                image = {
                    Item: {
                        Title: {
                            PersistedValue : file.name,
                            Value : file.name
                        },
                        DateCreated: now.toWcfDate(),
                        PublicationDate: now.toWcfDate(),
                        LastModified: now.toWcfDate()
                    }
                };

            return $http.put(url, image);
        };

        var service = {

            upload: function (file) {

                var deferred = $q.defer();

                var uploadFile = function (content) {

                    var formData = new FormData();
                    formData.append('ContentType', imageItemType);
                    formData.append('LibraryId', defaultAlbumId);
                    formData.append('ContentId', content.Item.Id);
                    formData.append('Workflow', 'Upload');
                    formData.append('ProviderName', ''); // TODO: implement this once you have provider selector
                    formData.append('SkipWorkflow', 'true');
                    formData.append('ImageFile', file);
                    
                    var xhr = new XMLHttpRequest();

                    xhr.onload = function (e) {
                        if (xhr.readyState === 4) {
                            if (xhr.status === 200) {
                                deferred.resolve(JSON.parse(xhr.responseText)[0]);
                            } else {
                                deferred.reject(xhr.statusText);
                            }
                        }
                    };

                    xhr.upload.onprogress = function (e) {
                        var done = e.position || e.loaded,
                            total = e.totalSize || e.total,
                            present = Math.floor(done / total * 100);
                        deferred.notify(present);
                    };

                    xhr.onerror = function (e) {
                        deferred.reject(xhr.statusText);
                    };

                    xhr.open('POST', uploadUrl);
                    xhr.send(formData);
                };

                createImage(file)
                    .success(function (data) {
                        uploadFile(data);
                    })
                    .error(function () {
                        console.log('Image creation error!');
                    });

                return deferred.promise;
            },

            /*
             * Retrieves a single image or album.
             * 
             * options:
             * id - If present, a single image will be returned. Represents the id of the image to be retrieved.
             * provider - The name of the provider from which to retrieve the item.
             * type - 'image' or 'album'; 'image' is default
             */
            get: function (options) {
                return $http.get(getImagesServiceUrl(options));
            },

            /*
             * Retrieves a collection of images, albums or both.
             * 
             * options:
             * skip - The number of items to skip before taking them in resulting dataset; default is 0
             * take - The maximum number of items to take in resulting dataset; default is 20
             * filter - The filter expression to apply when querying; default is null. It can be either 
             *          a string or a named filter object. The supported named filters are:
             *              recent : Returns the last 50 published items
             *              mine   : Returns only items that are owned by the current user
             * sort - The sort expression to apply when querying; default is null
             * parentLibrary - The parent library within which to query; by default it is null, so it won't be taken into account
             */
            query: function (options) {

                var settings = options || {},
                    getUrl = imageServiceUrl,
                    publicFilter = '(Visible=true AND Status=Live)',
                    skip = settings.skip,
                    take = settings.take || 20,
                    filter = settings.filter,
                    isNamedFiltering = typeof filter !== 'string',
                    namedFilters = {
                        all: publicFilter,
                        recent: '[ShowRecentLiveItems]',
                        mine: publicFilter + ' AND (Owner = (' + serverData.get('currentUserId') + '))'
                    },
                    sort = settings.sort,
                    isNamedSorting = typeof sort !== 'string',
                    namedSorts = {
                        newUploadedFirst: 'DateCreated DESC',
                        newModifiedFirst: 'LastModified DESC',
                        titleAtoZ: 'Title ASC',
                        titleZtoA: 'Title DESC'
                    };

                var addQueryKey = function (key, value) {
                    if (!value) {
                        return;
                    }

                    var delimiter = (getUrl.indexOf('?') > -1) ? '&' : '?';
                    getUrl += delimiter + key + '=' + value;
                };

                // set item type
                addQueryKey(itemTypeKey, imageItemType);

                // specify skip
                addQueryKey(skipKey, skip);

                // specify take
                addQueryKey(takeKey, take);

                // specify the filter
                var getFilterExpression = function () {

                    if (!filter) return publicFilter;

                    if (isNamedFiltering) {
                        if (!namedFilters[filter.name]) {
                            throw new Error('The named filter "' + filter.name + '" is not supported.');
                        }
                        return namedFilters[filter.name];
                    }

                    return publicFilter + ' AND (' + filter + ')';
                };

                addQueryKey(filterKey, getFilterExpression());

                // specify sort
                var getSortExpression = function () {
                    if (isNamedSorting) {
                        if (!namedSorts[sort.name]) {
                            throw new Error('The named sort expression "' + sort.name + '" is not supported.');
                        }
                        return namedSorts[sort.name];
                    }
                    return sort;
                };

                if (sort) {
                    addQueryKey(sortKey, getSortExpression());
                }

                return $http.get(getUrl);

            }

        };

        return service;

    }]);

}());