import {Logger} from '../../lib/hico/logger';
import {QlikService} from '../../lib/hico/services/qlik-service';
import {ListItem} from '../../classes/ListItem';
import {UtilService} from '../Services/UtilService';
import {$timeout} from '../Services/AngularService';

define([
	'qvangular',
	'../../templates/singleSelect.html',
	'../Services/UtilService'
	], function(qvangular, template){

	const qlikService = QlikService.getInstance();

	return qvangular.directive('singleselect', [
		'utilService', function(utilService){
			return {
				restrict: 'E',
				scope: {
					item: '=',
					type: '<',
					listitems: '=',
					multiid: '<',
					parentscope: '=',
					groupitem: '<',
				},
				replace: true,
				template: template,
				controller: ['$scope', '$element', function($scope, $element){
					$scope.layout = $scope.parentscope.layout;
					$scope.colors = $scope.parentscope.colors;
					$scope.itemId = $scope.layout.qInfo.qId + '-' + $scope.item.cId;
					$scope.utilService = utilService;
					$scope.activeItem = null;
					$scope.showDimPopover = false;

					$scope.$watch('item.cId', function() {
						$scope.itemId = $scope.layout.qInfo.qId + '-' + $scope.item.cId;
					});

					this.$onInit = function(){
						let parentScope = $scope.parentscope,
							listObject = parentScope._listObjects[$scope.item.dimId];

						if(!listObject){
							return;
						}
						const defaultSelection = ListItem.getDefaultSelection($scope.layout.listItems, $scope.item.dimId);
						defaultSelection !== null && parentScope.addSelection(listObject, defaultSelection, false, false);
					};

					$scope.openSelect = function(item){
						if(!qlikService.inEditMode()){
							if(!item.show){
								utilService.closeMenus($scope.listitems, $scope.item.cId);

								$scope.parentscope.menuOpen = true;
								item.show = !item.show;
								item.alignement = utilService.checkNumeric(item);

								if($scope.layout.appearance.orientation==='btn-inline' && utilService.screenWidth > 767 && !$scope.groupitem){
									const panelConatiner = $element.find('#panel_container_' + $scope.itemId);
									UtilService.setPanelOffsets($scope, $element, panelConatiner);

									panelConatiner.width($element[0].clientWidth);

									if(item.show){
										$element.parents("article").css("z-index", 2);
									}
								}

								utilService.handleMenuScroll($scope.itemId);
							}else{
								$scope.parentscope.menuOpen = false;
								item.show = !item.show;
							}

							let offset = 0;
							let hasSelect = false;

							$scope.item.selectValues && $scope.item.selectValues.qDataPages[0].qMatrix.some(function(matrixItem){
								if(matrixItem[0].qState === 'S'){
									hasSelect = true;
									return true;
								}
								offset += 31;
							});


							if(!hasSelect){
								offset = 0;
							}

							$timeout(function() {
								$element.find("#panel_" + $scope.itemId).scrollTop(offset);
							});

						}
					};

					$scope.checkNumeric = function(){
						let isNumeric = true;
						if(!$scope.item.selectValues){
							return false;
						}
						let qMatrix = $scope.item.selectValues.qDataPages[0].qMatrix;

						for(let i = 0; i <  qMatrix.length && i < 5 && isNumeric; i++){

							if(  qMatrix[i][0].qText){
								isNumeric =  qMatrix[i][0].qText.match(/^[0-9\.\-\/:\ \,]+$/g) !== null;
							}
						}
						return isNumeric;
					};

					$scope.closeDropdown = function(item){
						item.show = false;

						$scope.parentscope.menuOpen = false;
						$scope.selectValues = null;
						window.removeEventListener('click', clickevent);
						$scope.showDimPopover = false;
					};

					$scope.handleSelect = function(item){
						let alwaysSelect = $scope.item.props.alwaysSelectValue,
							dimensionInfo = $scope.item.selectValues.qDimensionInfo,
							selected = dimensionInfo.qStateCounts.qSelected;

						if(!alwaysSelect || (item[0].qState === 'S' && selected > 1 || item[0].qState !== 'S')){
							let parentScope = $scope.parentscope,
								listObject = parentScope._listObjects[$scope.item.dimId];

							listObject
								? parentScope.applySelection(listObject, item[0].qElemNumber, true)
								: Logger.warn('No listObject found with dimId', $scope.item.dimId);
						}
					};

					$scope.drillUp = function(index){
						if(typeof index !== 'undefined'){
							index = $scope.fields.length - index;
							$scope.parentscope._listObjects[$scope.item.props.dimId].drillUp('/qListObjectDef',0,index);
						}else{
							$scope.parentscope._listObjects[$scope.item.props.dimId].drillUp('/qListObjectDef',0,1);
						}

						window.removeEventListener('click', clickevent);
						$scope.showDimPopover = false;
					};

					$scope.showDrilldownDims = function(){
						let dimInfo = $scope.parentscope._listObjects[$scope.item.props.dimId].layout.qListObject.qDimensionInfo;
						$scope.fields = dimInfo.qGroupFieldDefs.slice(0, dimInfo.qGroupPos);

						if(!$scope.showDimPopover && $scope.fields.length > 0){
							window.addEventListener('click', clickevent);
						}
					};

					function clickevent(e){
						e.stopPropagation();
						let target = $(e.target);
						if($scope.showDimPopover && !target.hasClass('hico-popover-evt')){
							window.removeEventListener('click', clickevent);
							$scope.$apply(()=> $scope.showDimPopover = false);
						}else if(!$scope.showDimPopover){
							$scope.showDimPopover = true;
							$scope.$apply();
						}
					}
				}]
			}
		}
	]);
});