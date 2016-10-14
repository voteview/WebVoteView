% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
  <div style="margin-left:10px;" class="form-inline">
    <label for="chamber">Chamber:</label>
    <select class="dataSelect" name="chamber">
      <option value="both">Both</option>
      <option value="house">House</option>
      <option value="senate">Senate</option>
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
