# -*- coding: utf-8 -*-
import csv
from itertools import chain

#
# Setup a connection to the mongoDB server...
#
from pymongo import MongoClient
#Connection
connection = MongoClient()
#connection = Connection()
db = connection['voteview']
vcollection = db['voteview_rollcalls']
mcollection = db['voteview_members']


#
# Codings of vote choices
#
votecode = {0:'not in congress',
            1:'yea',
            2:'paired yea',
            3:'announced yea',
            4:'announced nay',
            5:'paired nay',
            6:'nay',
            7:'present',
            8:'present',
            9:'not voting/not ascertained'}

class Rollcall(dict):
    """Object describing a single roll call vote"""
    def __init__(self):
        """Instantiate a Rollcall""" 
        self.id = None
        self.rollnumber = None
        self.chamber = None
        self.session = None
        self.date = None
        self.question = None
        self.description = None
        self.shortdescription = None
        self.bill = None
        self.question = None
        self.sponsor = None
        self.result = {}
        self.code = {'Issue':[],'Peltzman':[],'Clausen':[]}
        self.nominate= {'zml':[None,None],'dl': [None,None],'pre':None, 'classified':None}
        self.votes = {}
        self.result = dict(zip([str(c) for c in range(10)],[0]*10))
        self.resultparty = {}
        self.yea = None
        self.nay = None
        self.support = None
        self.dimweight = {'H':0.4088, 'S':0.5513}

    def addendpoints(self):
        """Add attributes to nomimate attribute that aid in drawing cutting lines"""
        self.nominate['slope'] = None
        self.nominate['intercept'] = None
        if (self.nominate['zml'][0]==0 and float(self.nominate['zml'][1])==0 and 
                      float(self.nominate['dl'][0])==0 and float(self.nominate['dl'][1])==0):
            self.nominate['x'] = [0, 0]  
            self.nominate['y'] = [0, 0]
        elif abs(float(self.nominate['zml'][1])) < 1e-16:
            self.nominate['x'] = [ float(self.nominate['dl'][0]), 
                                       float(self.nominate['dl'][0]) ]
            self.nominate['y'] = [-10, 10]
        else:
            slope = -float(self.nominate['zml'][0])/(float(self.nominate['zml'][1]))
            intercept = -slope*float(self.nominate['dl'][0]) + float(self.nominate['dl'][1])
            self.nominate['x'] = [10, -10]
            self.nominate['y'] = [intercept + slope*xx for xx in 
                                         self.nominate['x']]
            self.nominate['slope'] = slope
            self.nominate['intercept'] = intercept


    def fromRollcallCsv(self,rec):
        """Parse and insert info from a record from the voteview.com description 
           file of a recent congress"""
        self.id = rec[0]
        self.rollnumber = int(rec[4])
        self.chamber = rec[5]
        self.session = int(rec[3])
        self.date = rec[1]
        self.description = rec[2].decode('utf8','replace') 
        
    def addcode(self,key,value):
        """Add an issue code to the rollcall"""
        if value is None:
            return None
        if self.code.has_key(key):
            self.code[key].append(value)
        else:
            self.code[key]=[value]
    
    def getVote(self,id):
        """Populate a Rollcall object from the database""" 
        print "id = %s" % id
        for vote in vcollection.find({'id':id}):
            for (k,v) in vote.iteritems():
                vars(self)[k] = v

    def structure(self):
        """Basic data structure to be inserted in the db.."""
        return( {'id':self.id,
                 'rollnumber':self.rollnumber,
                 'chamber':self.chamber,
                 'session':self.session,
                 'date':self.date,
                 'description':self.description,
                 'shortdescription':self.shortdescription,
                 'bill':self.bill,
                 'question':self.question,
                 'sponsor':self.sponsor,
                 'code':self.code,
                 'votes':self.votes,
                 'result':self.result,
                 'resultparty':self.resultparty,
                 'nominate':self.nominate,
                 'yea': self.yea,
                 'nay': self.nay,
                 'support': self.support} )

class RollcallCollection(list):
    """Collection of many rollcall objects"""
    def __init__(self,ids=None):
        self._buildCollection(ids)
        
    def _buildCollection(self,ids):
        rc = Rollcall()
        for id in ids:
            rc.getVote(id)
            self.append( rc.structure() )

    def toMatrix(self,by='icpsr'):
        """Create a matrix of votes from the rollcall collection.
           This is might be something that we need to speed up"""
        membervector = {}
        ct = 0
        for rc in self:
           for (kk,v) in rc['votes'].iteritems():
               k = by=='icpsr' and str(int(str(kk)[2:7])) or kk
               if membervector.has_key(k):
                   membervector[k].append(v)
               else:
                   membervector[k] = [0]*ct + [v]
           ct += 1
           for m in membervector.values():
               if len(m)<ct:
                   m.append(0)
        return membervector

class Member:
    """Describes a particular member of congress in a particular year"""
    def __init__(self):
        self.id = None
        self.name = None
        self.fname = None
        self.icpsr = None
        self.session = None
        self.startdate = None
        self.enddate = None
        self.cqlabel = None
        self.nominate = {'dimensionCorrelation':None,
                    'geoMeanProbability':None,
                    'logLikelihood':None,
                    'numberOfErrors':None,
                    'numberOfVotes':None,
                    'oneDimNominate':None,
                    'oneDimNominateBSE':None,
                    'twoDimNominate':None,
                    'twoDimNominateBSE':None}
        self.districtCode = None
        self.geo = None
        self.occupancy = None
        self.party = None
        self.partyname = None
        self.state = None
        self.stateCode = None
        self.stateName = None
        self.stateAbbr = None
        self.bioName = None
        self.dimweight = {'H':0.4088, 'S':0.5513}

        
    def getMember(self, id, session, startdate=None):
        """Populate from the db for a given person and session"""
        print "begin get mem"
        member = mcollection.find({'id':str(id),'session':str(session)})
        print "got mem"
        i = 0

	# Aaron: Fixing failed overwrite issue
	if not member.count(): # We didn't find the member, so re-initialize our instance to dump the last good data.
		self.__init__()

        print "filling out"
        for mem in member:
            print "found a member"
            for (k,v) in mem.iteritems():
                if k != 'nominate':
                    vars(self)[k] = v
                else:
                    self.nominate[k] = v
            i+=1
        if i>1:
            print "Uh Oh..."

    def getMemberByIcpsr(self, id):
        """Return the first record found in the member collection with 
           a given ICPSR number."""
        print "get mem begin"
        member = mcollection.find({'icpsr':int(id)})
        print "got mem end"
        i = 0

	# Aaron: Fixing failed overwrite issue
	if not member.count(): # We didn't find the member, so re-initialize us to dump the last good data
		self.__init__() 

        for mem in member:
            print "found a member???"
            for (k,v) in mem.iteritems():
                vars(self)[k] = v
            break

    def structure(self):
        """Member data structure to be stored in the db...""" 
        return( {'id':self.id,
                 'icpsr':self.icpsr,
                 'session':self.session,
                 'startdate':self.startdate,
                 'enddate':self.enddate,
                 'cqlabel':self.cqlabel,
                 'nominate':self.nominate,
                 'districtCode':self.districtCode,
                 #'geo':self.geo,
                 'name':self.name,
                 'partyname':self.partyname,
                 'fname':self.fname,
                 'occupancy':self.occupancy,
                 'party':self.party,
                 'state':self.state,
                 'stateAbbr':self.stateAbbr,
                 'stateName':self.stateName,
                 'stateCode': self.stateCode,})

if __name__ == "__main__":
    test_collection = True
    test_member = True

    rc = Rollcall()
    rc.getVote("H0010002")
    print rc.structure()['nominate']
    rc.addendpoints()
    print rc.structure()['nominate']

    if test_collection:
        rcc = RollcallCollection(ids=['S0941037','H0100163'])
        print rcc.toMatrix(by='icpsr')

        
    if test_member:
        m = Member()
        #m.getMember(123,3)
        m.getMemberByIcpsr('123')
        print m.structure()
