# Not super clear to me who wrote this or when, probably Jeff?

import xlwt
import cStringIO as StringIO

class WriteXls:
    """Class to make roll call vote extract matrix in XLS format"""

    def __init__(self,rollcalls=[[]],votes=[[]],members=[[]]):
        self.wb = xlwt.Workbook()
        self.votesheet = self.wb.add_sheet("Vote Matrix")
        self.membersheet = self.wb.add_sheet("Member Descriptions")
        self.rollcallsheet = self.wb.add_sheet("Roll Call Descriptions")
        self.members = members
        self.rollcalls = rollcalls
        self.votes = votes

    def _freeze(self,sheet,x=1,y=1):
        sheet.set_panes_frozen(True)
        sheet.set_vert_split_pos(x)
        sheet.set_horz_split_pos(y)

    def render(self):
        output = StringIO.StringIO()
        self.wb.save(output)
        return output.getvalue()

    def _fillinSheet(self,sheet,data,startrow=2):
        """Fillin spreadsheet from a list of lists"""
        i = startrow-1
        for r in data:
            j = 0
            for c in r:
                sheet.write(i,j,c)
                j+=1
            i += 1

    def addVotes(self):
        hd = self.votes[0]
        i = 0
        for val in hd:
            self.votesheet.write(0,i,val)
            if val[0]=="V":
                self.votesheet.col(i).width = 0x0400
            i += 1
        self._fillinSheet(self.votesheet,self.votes[1:])
        self._freeze(self.votesheet)

    def addRollcalls(self):
        hd = self.rollcalls[0]
        i = 0
        for val in hd:
            self.rollcallsheet.write(0,i,val)
            i += 1
        self._fillinSheet(self.rollcallsheet,self.rollcalls[1:])
        self._freeze(self.rollcallsheet)

    def addMembers(self):
        hd = self.members[0]
        i = 0
        for val in hd:
            self.membersheet.write(0,i,val)
            i += 1
        self._fillinSheet(self.membersheet,self.members[1:])
        self._freeze(self.membersheet)

    def testsave(self):
        self.wb.save("test.xls")

if __name__ == "__main__":
    wxls = WriteXls(votes=[["Name"],['John'],['Bill'],['Fred']] )
    wxls.addVotes()
    wxls._freeze(wxls.votesheet)
    print wxls.testsave()
