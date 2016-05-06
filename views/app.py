import sys
#import cherrypy
import os
import json
from model.voteview_objects import *
from model.mongoQ import query
from model.downloadAPI import downloadAPI
from model.writeXls import WriteXls
from model.writeRollcallJson import writeRollcall

from bottle import request,run,route,response,template,static_file 

def defaultValue(x,value = None):
    return x is not "" and x or value

infofields = [('icpsr','icpsr'),
              ('state','state'),
              ('districtCode','district'),
              ('cqlabel','cqlabel'),
              ('name','name'),
              ('party','party')]

descriptionfields = [('chamber','chamber'),
                     ('session','congress'),
                     ('date','date'),
                     ('rollnumber','rollnumber'),
                     ('description','description')]


#
# Web pages
#
@route('/static/<path:path>')
def callback(path):
        return static_file(path,"./static")

@route("/")
def index():
    return "VoteView server..."

@route("/about")
def about():
    output = template('views/about')
    return output

@route("/search_query")
def search_query():
    output = template('views/search')
    return output

#
# API methodss
#
@route("/getvote")
def getvote():
    id = defaultValue(request.query.id)
    response.content_type = 'application/json'
    rc = Rollcall()
    rc.getVote(id)
    if rc.session is not None:
        return( json.dumps( rc.structure() ) )
    else:
        return( json.dumps( {'error':'No such vote'} ) )

@route("/getmembers")
def getmembers():
    session = defaultValue(request.query.session)
    response.content_type = 'application/json'
    members = {}
    for m in mcollection.find({'session':int(unicode(session))}):
        del( m['_id'] )
        members[m['id']] = m
    if len(members.keys())==0:
        return( json.dumps( {'error':'No members found'} ) )
    else:
        return( json.dumps( members ) )

@route("/getmemberslist")
def getmemberslist():
    session = defaultValue(request.query.session)
    response.content_type = 'application/json'
    members = []
    for m in mcollection.find({'session':int(unicode(session))}):
        del( m['_id'] )
        members.append(m)
    if len(members)==0:
        return( json.dumps( {'error':'No members found'} ) )
    else:
        return( json.dumps( members ) )

@route("/getmembersbyname")
def getmembersbyname():
    name = defaultValue(request.query.name)
    icpsr = defaultValue(request.query.icpsr)
    state = defaultValue(request.query.state)
    session = defaultValue(request.query.session)
    cqlabel = defaultValue(request.query.cqlabel)
    
    response.content_type = 'application/json'
    if not name and not icpsr and not state and not session and not cqlabel:
        return(json.dumps({'errormessage': 'No search terms provided'}))

    searchQuery = {}
    if icpsr:
        icpsr = int(icpsr)
        searchQuery["icpsr"] = icpsr
    if state:
        state = str(state)
        searchQuery["stateAbbr"] = state.upper()
    if session:
        if not " " in session:
            session = int(session)
            searchQuery["session"] = session
        elif "[" in session and "]" in session and "to" in session:
            valText = session[1:-1]
            min, max = valText.split(" to ")
            searchQuery["session"] = {}
            if len(min):
                searchQuery["session"]["$gte"] = int(min)
            if len(max):
                searchQuery["session"]["$lte"] = int(max)
        else:
            vals = [int(val) for val in session.split(" ")]
            searchQuery["session"] = {}
            searchQuery["session"]["$in"] = vals
    if name:
        name = str(name)
        if not " " in name: # Last
            searchQuery["name"] = {'$regex': name, '$options': 'i'}
        elif ", " in name: # Last, First
            last, rest = name.split(", ")
            searchQuery["fname"] = {'$regex': last+", "+rest, '$options': 'i'}
        else:
            rest, last = name.rsplit(" ",1)
            if last.lower() in ['jr.', 'ii', 'sr.', 'iii', 'iv']:
                suffix = last
                rest, last = rest.rsplit(" ",1)
                rest = rest+" "+suffix
            searchQuery["fname"] = {'$regex': last+", "+rest, '$options': 'i'}
    if cqlabel:
        if cqlabel[0]=="(" and cqlabel[-1]==")":
            searchQuery["cqlabel"] = cqlabel
        else:
            searchQuery["cqlabel"] = "("+cqlabel+")"

    response = []
    errormessage = ""
    for m in mcollection.find(searchQuery,{'_id': 0}):
        response.append(m)
    if len(response)>50:
        errormessage = "Capping number of responses at 50."
    if len(response)==0:
        return(json.dumps({'errormessage': 'No results'}))
    elif errormessage:
        return(json.dumps({'errormessage': errormessage, 'results': response}))
    else:
        return(json.dumps({'results': response}))

def searchdt():
    q = response.content_type(request.query.q)
    _ = defaultValue(request.query._)
    startdate = defaultValue(request.query.startdate)
    enddate = defaultValue(request.query.enddate)
    chamber = defaultValue(request.query.chamber)
    asjson = defaultValue(request.query.asjson,True)
    
    if asjson:
        response.content_type = 'application/json'
    res = query(q,startdate,enddate,chamber)
    #for i in range(0,len(res['rollcalls']):
    #    if res['rollcalls'][i].has_key('session') is False:
    #        del res['rollcalls'][i]
    return( json.dumps( {'aaData':res['rollcalls']} ) )    

@route("/search")
def search():
    q = defaultValue(request.query.q)
    startdate = defaultValue(request.query.startdate)
    enddate = defaultValue(request.query.enddate)
    chamber = defaultValue(request.query.chamber) 
    asjson = defaultValue(request.query.asjson,True)
    print "XXX%sXXX" % chamber
    if asjson:
        response.content_type = 'application/json'
    else:
        response.conte_type = 'text/plain'

    res = query(q,startdate,enddate,chamber)
    if asjson:
	return( json.dumps(res) )
    else:
	return res

@route("/downloadAPI")
def downloadAPI():
    rollcall_id = defaultValue(request.query.rollcall_id)
    apitype = defaultValue(request.query.apitype,"Web")
    asjson = defaultValue(request.query.asjson,True)
    if asjson:
        response.content_type = "application/json"
    else:
        response.content_type = "text/plain"

    res = downloadAPI(rollcall_id, apitype)
    if asjson:
        return(json.dumps(res))
    else:
        return res

def _memberinfo(self,m):
    return( [vars(m)[f[0]] for f in self.infofields] )

@route("/download")
def download():
    ids = defaultValue(request.query.ids)
    xls = "True"
    ids = [i.strip() for i in ids.split(',')]
    rcc = RollcallCollection(ids=ids)

    # Roll call descriptions
    rollcalls = [['vote']+[f[1] for f in self.descriptionfields]]
    rollcalls[0][2] = 'congress'
    i = 1
    for r in rcc:
        rollcalls.append( ['V%i' % i] + 
                          [ r[f[0]] for f in self.descriptionfields] )
        i += 1

    # Roll roll call matrix
    m = Member()
    votematrix = [[f[1] for f in self.infofields] +
                  ["V%i" % (i+1) for i in range(len(ids))]]

    for k,v in rcc.toMatrix(by='icpsr').iteritems():
        m.getMemberByIcpsr(k)
        votematrix.append([str(mm) for mm in self._memberinfo(m)]+
                          [str(vv) for vv in v])
            
    if xls == "True":
        response.content_type = 'application/x-excel'
        # Write workbook
        print "Writing workbook..."
        wxls = WriteXls(rollcalls=rollcalls,votes=votematrix)
        wxls.addVotes()
        wxls.addRollcalls()
        return  wxls.render()
    else:
        response.content_type = 'application/json'
        return writeRollcall(rollcalls,votematrix)

@route("/apiVersion")
def apiVersion():
    return(json.dumps({'apiversion': 'Q2'}))

run(host='localhost', port=8080, debug=True)
