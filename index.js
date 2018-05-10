String.prototype.replaceAll = function(strReplace, strWith) {
    // See http://stackoverflow.com/a/3561711/556609
    var esc = strReplace.replace(/[-\/\\^$*+?.()@#|[\]{}]/g, '\\$&');
    var reg = new RegExp(esc, 'ig');
    return this.replace(reg, strWith);
};
function getYesterday() {
//returns yesterdays date
  var d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}
function getFormattedDate(d) {
//returns date in YYYY-mm-dd format
  return d.toISOString().slice(0,10);
}
function getYesterdayFormatted() {
//returns yesterdays date in YYYY-mm-dd format
  return getFormattedDate(getYesterday());
}

function ODItoSQL(sql) {
  var replaceCount = (sql.match(/#ST.V_LVRUNDATE/g) || []).length;
  replaceCount += (sql.match(/#ST.TERM_LIST/g) || []).length;
  replaceCount += (sql.match(/@EPM_SYSADM/g) || []).length;
  sql = sql.replaceAll('#ST.V_LVRUNDATE', getYesterdayFormatted());
  sql = sql.replaceAll('#ST.TERM_LIST', "'2172','2175','2178','2182','2185','2188','2192'");
  sql = sql.replaceAll('@EPM_SYSADM', '');
  console.log(replaceCount);
  return {
    sql:sql,
    changes:replaceCount
  };
}
function DStoSQL(sql) {
  var replaceCount = (sql.match(/#\$UNLVDS_SCHEMA#/g) || []).length;
  replaceCount += (sql.match(/#\$OWS_SCHEMA#/g) || []).length;
  replaceCount += (sql.match(/#\$NA_SID#/g) || []).length;
  replaceCount += (sql.match(/#\$TERM_LIST#/g) || []).length;
  replaceCount += (sql.match(/#LVRUNDATE#/g) || []).length;
  sql = sql.replaceAll('#$UNLVDS_SCHEMA#', 'unlvds.');
  sql = sql.replaceAll('#$OWS_SCHEMA#', 'sysadm.');
  sql = sql.replaceAll('#$NA_SID#', '-1');
  sql = sql.replaceAll('#$TERM_LIST#', "'2172','2175','2178','2182','2185','2188','2192'");
  sql = sql.replaceAll('#LVRUNDATE#', getYesterdayFormatted());
  return {
    sql:sql,
    changes:replaceCount
  };
}
function getUndoDimensionExecutionCode(table) {
  var code = `DECLARE
    mostRecentChange DATE;
    dayBeforeMostRecentChange DATE;
BEGIN
    SELECT max(LV_START_DATE) INTO mostRecentChange FROM ${table};
    SELECT mostRecentChange -1 INTO dayBeforeMostRecentChange FROM dual;
    /*remove rows added during the last execution*/
    DELETE
    FROM   ${table}
    WHERE  LV_START_DATE = mostRecentChange;
    /*unhistorize rows, that were historized during the last execution*/
    UPDATE ${table}
    SET    LV_END_DATE  = '12/31/2999',
           LV_ISCURRENT = 'Y'
    WHERE  LV_END_DATE  = dayBeforeMostRecentChange;
END;`;
  return code;
}
$(function(){
  $("button").button();

  $("#dsWarn").hide();
  $("#convert").click(function() {
    var type = "none";
    var sql = $("#sql").val();
    result = ODItoSQL(sql);
    if(result.changes !== 0)  {
      type = "odi";
      $("#sql").val(result.sql);
      $("#notification").html("The code has been converted and copied to your clipboard <br> Code type detected: ODI <br> " + result.changes + " replacements have been made.");
    }
    else {
      result = DStoSQL(sql);
      if(result.changes !== 0) {
          type = 'ds';
          $("#sql").val(result.sql);
          $("#notification").html("The code has been converted and copied to your clipboard <br> Code type detected: Data Stage <br> " + result.changes + " replacements have been made.");
          $("#dsWarn").show();
      }
    }
    if(type === 'none') {
      // TODO: Change color to yellow
      $("#notification").html("Code type not detected <br> 0 replacements have been made.");
    }
    $("#sql").select();
    document.execCommand("Copy");
    $("#notification").fadeIn('fast');
  });
  $("#clear").click(function() {
    $("#notification").hide();
    $("#dsWarn").hide();
    $("#sql").val('');
  });
  $("#clear2").click(function() {
    $("#notification2").hide();
    $("#sql").val('');
  });
  $("#submit").click(function() {
      $("#notification2").hide();
      if($("#table").val() == '') {
        alert("please enter a table name");
        $("#table").focus();
        return false;
      }
      var table = $("#table").val();
      var sqlUndo = getUndoDimensionExecutionCode(table);
      $("#sqlUndo").val(sqlUndo);
      $("#sqlUndo").select();
      document.execCommand("Copy");
      $("#notification2").fadeIn('fast').delay(5000).fadeOut('slow');
  });
});
/* for future development commonly used queries
--TABLENAME is case sensitive
SELECT LISTAGG (COLUMN_NAME, ', ') WITHIN GROUP (ORDER BY COLUMN_ID)
FROM USER_TAB_COLS WHERE TABLE_NAME = 'TABLENAME';
*/
/*--Enable DBMS_OUTPUT.PUT_LINE
set serveroutput on;
*/
/*
--Get data from production while connected to development
@lvepmprd2lvepmdev;--Add to end of table name
*/
/*
--Load production values into development Table
truncate table ${table};

--delete from ${table};--If no truncate permissions

insert into ${table}
select * from ${table}@lvepmprd2lvepmdev;
*/
/*
ODI code segments
TO_DATE('#ST.V_LVRUNDATE','YYYY-MM-DD') between LV_START_DATE and LV_END_DATE
STRM in (#ST.TERM_LIST)
*/
