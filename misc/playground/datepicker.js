angular.module('ui.bootstrap.datepicker', [])

.constant('datepickerConfig', {
  dayFormat: 'dd',
  monthFormat: 'MMMM',
  yearFormat: 'yyyy',
  dayHeaderFormat: 'EEE',
  dayTitleFormat: 'MMMM yyyy',
  monthTitleFormat: 'yyyy',
  showWeeks: true,
  startingDay: 0,
  yearRange: 20,
  storeFormat: null,
  minDate: null,
  maxDate: null
})

.directive( 'datepicker', ['dateFilter', '$parse', 'datepickerConfig', function (dateFilter, $parse, datepickerConfig) {
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      model: '=ngModel',
      dateDisabled: '&'
    },
    templateUrl: 'template/datepicker/datepicker.html',
    link: function(scope, element, attrs) {
      scope.mode = 'day'; // Initial mode

      // Configuration parameters
      var selected  = new Date(),
          config    = angular.extend({}, datepickerConfig),
          watchable = {};

      // config assignment via datepicker attrs
      if (angular.isDefined(attrs.datepicker)) {
        var attr = scope.$eval(attrs.datepicker) ;

        if (angular.isObject(attr)) {
          angular.extend(config, attr);
        }
        else if (angular.isString(attr)) {
          if (attr.match(/day|month|year/)) {
            scope.mode = attr;
          }
        }
      }

      if (angular.isDefined(attrs.datepickerMode)){
        scope.mode = scope.$eval(attrs.datepickerMode);
        watchable.mode = attrs.datepickerMode;
      }
      // override config with individual assignment via attrs with same name
      for (var k in config){
        if (angular.isDefined(attrs[k])) {
          config[k]     = scope.$eval(attrs[k]);
          watchable[k]  = attrs[k] ;
        }
      }

      // watchable init
      if (watchable.showWeeks) {
        scope.$parent.$watch($parse(watchable.showWeeks), function(value) {
          config.showWeeks = !! value;
          updateShowWeekNumbers();
        });
      } else {
        updateShowWeekNumbers();
      }

      if (watchable.minDate) {
        scope.$parent.$watch($parse(watchable.minDate), function(value) {
          config.minDate = Date.parse(value) && new Date(value);
          refill();
        });
      }
      if (watchable.maxDate) {
        scope.$parent.$watch($parse(watchable.maxDate), function(value) {
          config.maxDate = Date.parse(value) && new Date(value);
          refill();
        });
      }

      function updateCalendar (rows, labels, title) {
        scope.rows = rows;
        scope.labels = labels;
        scope.title = title;
      }

      // Define whether the week number are visible
      function updateShowWeekNumbers() {
        scope.showWeekNumbers = ( scope.mode === 'day' && config.showWeeks );
      }

      function compare( date1, date2 ) {
        if ( scope.mode === 'year') {
          return date2.getFullYear() - date1.getFullYear();
        } else if ( scope.mode === 'month' ) {
          return new Date( date2.getFullYear(), date2.getMonth() ) - new Date( date1.getFullYear(), date1.getMonth() );
        } else if ( scope.mode === 'day' ) {
          return (new Date( date2.getFullYear(), date2.getMonth(), date2.getDate() ) - new Date( date1.getFullYear(), date1.getMonth(), date1.getDate() ) );
        }
      }

      function isDisabled(date) {
        return ((config.minDate && compare(date, config.minDate) > 0) 
              || (config.maxDate && compare(date, config.maxDate) < 0) 
              || (scope.dateDisabled && scope.dateDisabled({ date: date, mode: scope.mode }))
              );
      }

      // Split array into smaller arrays
      var split = function(a, size) {
        var arrays = [];
        while (a.length > 0) {
          arrays.push(a.splice(0, size));
        }
        return arrays;
      };

      var getDaysInMonth = function( year, month ) {
        return new Date(year, month + 1, 0).getDate();
      };

      var fill = {
        day: function() {
          var days = [], labels = [], lastDate = null;

          function addDays( dt, n, isCurrentMonth ) {
            for (var i =0; i < n; i ++) {
              days.push( {date: new Date(dt), isCurrent: isCurrentMonth, isSelected: isSelected(dt), label: dateFilter(dt, config.dayFormat), disabled: isDisabled(dt) } );
              dt.setDate( dt.getDate() + 1 );
            }
            lastDate = dt;
          }

          var d = new Date(selected);
          d.setDate(1);

          var difference = config.startingDay - d.getDay();
          var numDisplayedFromPreviousMonth = (difference > 0) ? 7 - difference : - difference;

          if ( numDisplayedFromPreviousMonth > 0 ) {
            d.setDate( - numDisplayedFromPreviousMonth + 1 );
            addDays(d, numDisplayedFromPreviousMonth, false);
          }
          addDays(lastDate || d, getDaysInMonth(selected.getFullYear(), selected.getMonth()), true);
          addDays(lastDate, (7 - days.length % 7) % 7, false);

          // Day labels
          for (i = 0; i < 7; i++) {
            labels.push(  dateFilter(days[i].date, config.dayHeaderFormat) );
          }
          updateCalendar( split( days, 7 ), labels, dateFilter(selected, config.dayTitleFormat) );
        },

        month: function() {
          var months = [], i = 0, year = selected.getFullYear();
          while ( i < 12 ) {
            var dt = new Date(year, i++, 1);
            months.push( {date: dt, isCurrent: true, isSelected: isSelected(dt), label: dateFilter(dt, config.monthFormat), disabled: isDisabled(dt)} );
          }
          updateCalendar( split( months, 3 ), [], dateFilter(selected, config.monthTitleFormat) );
        },

        year: function() {
          var years = [], year = parseInt((selected.getFullYear() - 1) / config.yearRange, 10) * config.yearRange + 1;
          for ( var i = 0; i < config.yearRange; i++ ) {
            var dt = new Date(year + i, 0, 1);
            years.push( {date: dt, isCurrent: true, isSelected: isSelected(dt), label: dateFilter(dt, config.yearFormat), disabled: isDisabled(dt)} );
          }
          var title = years[0].label + ' - ' + years[years.length - 1].label;
          updateCalendar( split( years, 5 ), [], title );
        }
      };

      var refill = function() {
        fill[scope.mode]();
      };

      var isSelected = function( dt ) {
        var odt = Date.parse(scope.model) && new Date(scope.model);

        if ( odt && odt.getFullYear() === dt.getFullYear() ) {
          if ( scope.mode === 'year' ) {
            return true;
          }
          if ( odt.getMonth() === dt.getMonth() ) {
            return ( scope.mode === 'month' || (scope.mode === 'day' && odt.getDate() === dt.getDate()) );
          }
        }
        return false;
      };

      scope.$watch('model', function ( dt, olddt ) {
        if ( Date.parse(dt) ) {
          selected = new Date(dt);
        }

        if ( ! angular.equals(dt, olddt) ) {
          refill();
        }
      });

      scope.$watch('mode', function() {
        updateShowWeekNumbers();
        refill();
      });

      scope.select = function( dt ) {
        selected = new Date(dt);

        if ( scope.mode === 'year' ) {
          scope.mode = 'month';
          selected.setFullYear( dt.getFullYear() );
        } else if ( scope.mode === 'month' ) {
          scope.mode = 'day';
          selected.setMonth( dt.getMonth() );
        } else if ( scope.mode === 'day' ) {
          scope.model = new Date(selected);
          if (config.storeFormat) {
             scope.model =  angular.isFunction(scope.model[config.storeFormat]) ? 
                              scope.model[config.storeFormat]() : dateFilter(scope.model, config.storeFormat) ;
          }
        }
      };

      scope.move = function(step) {
        if (scope.mode === 'day') {
          selected.setMonth( selected.getMonth() + step );
        } else if (scope.mode === 'month') {
          selected.setFullYear( selected.getFullYear() + step );
        } else if (scope.mode === 'year') {
          selected.setFullYear( selected.getFullYear() + step * config.yearRange );
        }
        refill();
      };

      scope.toggleMode = function() {
        scope.mode = ( scope.mode === 'day' ) ? 'month' : ( scope.mode === 'month' ) ? 'year' : 'day';
      };

      scope.getWeekNumber = function(row) {
        if ( scope.mode !== 'day' || ! scope.showWeekNumbers || row.length !== 7 ) {
          return;
        }

        var index = ( config.startingDay > 4 ) ? 11 - config.startingDay : 4 - config.startingDay; // Thursday
        var d = new Date( row[ index ].date );
        d.setHours(0, 0, 0);
        return Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1) / 7); // 86400000 = 1000*60*60*24;
      };
    }
  };
}]);

