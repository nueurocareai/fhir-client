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
        // Encounter API call
        var encounter = smart.patient.api.search({
          type: 'Encounter',
          query: {
            patient: patient.id
          }
        });
        $.when(pt, obv, appt, encounter).fail(onError);

        $.when(pt, obv, appt, encounter).done(function(patient, obv, appt, encounter) {
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

          var p = defaultPatient()
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
            // Assuming appointmentData is an array of objects
          var listOfAppointments = [];
          appointmentData = appt.data.entry;
          for (var i = 0; i < appointmentData.length; i++) {
            let appointment = appointmentData[i];
            let id = appointment.resource.id;
            let status = appointment.resource.status;
            let description = appointment.resource.description;
            let startDate = appointment.resource.start;
            let endDate = appointment.resource.end;
            let actor = appointment.resource.participant[0].actor.display;

            let appointmentDictionary = {
              "id": id,
              "status": status,
              "description": description,
              "startDate": startDate,
              "endDate": endDate,
              "actor": actor,
              "patient": patient.name[0].given.join(' ')
            };

            listOfAppointments.push(appointmentDictionary);
          }
          }
            if (encounter != null) {
            // Here you can process the appointment data received from the API
            // Assuming appointmentData is an array of objects
          var listOfEncounter = [];
          var EncounterData = encounter.data.entry;
          for (var i = 0; i < EncounterData.length; i++) {
            let encounterData = EncounterData[i];
            let divData = encounterData.resource.text.meta.div

            let encounterDictionary = {
              "div": divData
            };

            listOfEncounter.push(encounterDictionary);
          }
          }

          ret.resolve(p, listOfAppointments, listOfEncounter);
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

  window.drawVisualization = function(p, appointments, encounters) {
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
    $.each(appointments, function(index, data) {
            var row = $("<tr>");
            row.append($("<td>").text(data.id));
            row.append($("<td>").text(data.status));
            row.append($("<td>").text(data.description));
            row.append($("<td>").text(data.start_date));
            row.append($("<td>").text(data.end_date));
            row.append($("<td>").text(data.actor));
            row.append($("<td>").text(data.patient));
            $("#appointmentTable tbody").append(row);
        });
    var tableBody = document.querySelector('#PatientEncounter tbody');
    encounters.forEach(function(item) {
        var divContent = item.div;
        var tempElement = document.createElement('div');
        tempElement.innerHTML = divContent;

        var row = document.createElement('tr');
        var cells = tempElement.querySelectorAll('p');
        cells.forEach(function(cell) {
            var cellText = cell.textContent.trim();
            var colonIndex = cellText.indexOf(':');
            var value = cellText.substring(colonIndex + 1).trim();

            var td = document.createElement('td');
            td.textContent = value;
            row.appendChild(td);
        });

        tableBody.appendChild(row);
    });
  };

})(window);
