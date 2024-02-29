(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }
    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                              'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
                      }
                    }
                  });
        var appt = smart.patient.api.search({
                    type: 'Appointment',
                    query: {
                      patient: patient.id,
                      date: 'ge2023-12-30T09:00:00Z'
                    }
                  });

        $.when(pt, obv, appt).fail(onError);

        $.when(pt, obv, appt).done(function(patient, obv, appt) {
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;

          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            console.log( patient.name[0].family);
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family;
            //lname = patient.name[0].family.join(' ');
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var p = defaultPatient();
          //var pApp = patientApp();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.height = getQuantityValueAndUnit(height[0]);

          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);

          // Process appointment data
          if (appt != null) {
            // Here you can process the appointment data received from the API
            var appointmentData = appt.data.entry[0];
            var id= appt.data.entry[0].resource.id;
            var status = appt.data.entry[0].resource.status;
            var description = appt.data.entry[0].resource.description;
            var startDate = appt.data.entry[0].resource.start;
            var endDate = appt.data.entry[0].resource.end;
            var actor = appt.data.entry[0].resource.participant[0].actor.display;
            var patient_name = patient.name[0].given.join(' ');
            p.id = id;
            p.status = status;
            p.description = description;
            p.start_date = startDate;
            p.end_date = endDate;
            p.actor = actor;
            p.patient = patient_name;
            // For example, you can extract specific appointment details and include them in the patient object
            // p.appointments = appt.map(appointment => ({
            //   // Extract and format relevant appointment details
            // }));
          }

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},

    };
  }
    function patientApp(){
    return {
      id: {value: ''},
      status: {value: ''},
      description: {value: ''},
      start_date: {value: ''},
      end_date: {value: ''},
      actor: {value: ''},
      patient: {value: ''},
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    $('#id').html(p.id);
    $('#status').html(p.status);
    $('#description').html(p.description);
    $('#start_date').html(p.start_date);
    $('#end_date').html(p.end_date);
    $('#actor').html(p.actor);
    $('#patient').html(p.patient);
  };

})(window);
