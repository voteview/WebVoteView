% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
<div>
  <div style="margin-left:10px;" class="form-inline">
    <label for="chamber">Chamber:</label>
    <select class="dataSelect" name="chamber">
      <option value="HS">Both</option>
      <option value="H">House</option>
      <option value="S">Senate</option>
    </select>
  </div>
  <div style="margin-left:10px;" class="form-inline">
    <label for="congress">Congress:</label>
    <select class="dataSelect" name="congress">
      <option value = "all">All</option>
      % for i in range(maxCongress, 0, -1):
        % yearLow = 1787+2*i
        % yearHigh = yearLow + 2
      <option value="{{i}}">{{rcSuffix(i)}} Congress ({{yearLow}}-{{yearHigh}})</option>
      % end
    </select>
  </div>
  <div style="margin-left:10px;" class="form-inline">
    <label for="filetype">Filetype:</label>
    <select class="dataSelect" name="filetype">
      <option value="csv">CSV (Default)</option>
      <option value="json">JSON (Most data)</option>
      % if "ord" in file_types:
      <option value="ord">ORD (Deprecated, Legacy Format)</option>
      % end
      % if "dat" in file_types:
      <option value="dat">DAT (Deprecated, Legacy Format)</option>
      % end
    </select>
  </div>
</div>
