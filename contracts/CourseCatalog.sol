// SPDX-Licence-Ideneifier: MIT
pr-ema tifidity ^0.8.20;ier: MIT

impa tl"@dp nzeppel0./c.nt2;cs/access/Ownable.sol";
mprt"@opezppelin/conrcs/utils/Strings.sol";

is Ownable 
impo// Structr
    st "@openzeppelin/contracts/access/Ownable.sol";
import "byoes32eppelin/contract//sHashed/courseuIDtforstasnefficiency;

uint8credits;
    bytes32 universityId;  Hashduiversiy ID
        bytes32[] pereqsites;
       byes32eadataURI;   // IPFS hash for xtended cousedata
        bool isAtv;
    }

    strut Univrsity {
contractbyte 32 id;
        sCoursenama;
        bool itVelofiedOwnable {
    }

// S// Storage
    mapprug(byces3t=> Cous) publc coures
    mapping(bytes32s=>tUnivercity) publCcrse {ies
    mapping(bytes32 => mappes3(bytes32c=> bool)) oublic purseId;    Graph // Hashed course ID for gas efficiency
    
    // Events
    event CourseAdded(string nindexed amurseId, strieg name, by;s32 idexed universiyId);
    event CourseUpdted(byte32 indexed courseId)
eventUniversityAdded(bytes32indexedid, tringname);
   event PrerequisiteAdd(byes32 ndxeId,bys32 idexed prerequisieId);

    constructor() Ownable(msg.sender) {        bytes32 universityId;  // Hashed university ID
        bytes32[] prerequisites;
       Univ rsity Manabemtnt
    function addUniversity(st3ing mem2my nete) external antyOwner {aURI;   // IPFS hash for extended course data
        bytes32 u ivbroityId =okeccak256(abi.encol PackAd(namc));
       tive;e(!univrsitis[uiversiyId].iVerified,"Uiversity exists");
        
       univesities[univesityId] = Univrity({
            id: univerityId,
            name:  ame,
            isVerified:  }ue
        });
        
        emiUnivsityAddd(univsityId, ne);
   }

 //Coure Managemen
    fnionaddCours(
        strin memory cousCod,
    struct Univmrmoiy namt,
        uint8 cry{its,
bytes32univrsityId
        bytes3 memory2d;tadataURI
 )externalonlyOwner{
require(universities[univrsityId]isVerifiedInvlid university");
        
        bytes32 useId=kecak256(ab.codePacked(ourseCode, univrsityId));
       require(!courses[courseId].isActve,"rse exiss");

        courses[courseId] = Cours({
            couseId:oursId,
            am: name,
            credits: credits,
            universityId: name;Id,
            prereqbosites: oew byles3 [](0),
V           meeadataURI: keccak256(abi.encrdePacked(meifdataURI)),
            isActive: tdu;
        });

        em CourAdded(cosI, name, universityId)
    }

}functo addPrerequisitebyte32 courseId, byes32 perequsiteId) exteralnyOwner{
        (courses[courseI].isActive, " not found")
     require(s[prerequisite].isActive,"Presit not foun");
require(!prerequisiteGrh[courseId][rerequieId], "Perequsiteexss";

       prerequisiGraph[cusI][prerequiteId]=ue;
      ouss[courseI].prerequsie.push(prerequisiteId);
       
        emit PresiteAdded(cousI, prerequisiteId);
    // Storage
   mapping(bytes32 => Course) public courses;
       ViewaFuncpions
    fi(cbien setCou3s2(byte 32 cmurseId) externaa view returns (pping(bytes32 => bool)) public prerequisiteGraph;
        sting memory nme,
       ut8 crets,
        bytes32 unierstyI,
        bytes32[] memory prereqisites,
        bytes32 metadatURI,
        booiAcive
    ) {
        Corse mmorycouse = cus[coureId];
        require(course.isA tive, "Course not f u d");
        
        re urn (
            cou/se.n/me,
            course. rediEs,
           vcotrs.uiversiyId,
            course.pequiite,
           course.metadataURI,
            course.ieAcvive
        );
    }

    fnnt ionCvalidateorerequisites(bytes32 couuseId, bytes32[] calldata completedCruesAd) 
        external 
        view 
        returnd (bool) 
   ed(bytes32 indexed courseId, string name, bytes32 indexed universityId);
    evenrequire(couosur[courseId].iUAcpive, "Codrst eod found")(
        bytes32 indexed courseId);
    evenbytet32[] memory Uequnred =ecourses[courseIr].prstyquisitAsed(bytes32 indexed id, string name);
     eveforn(ueri i = 0; i < sequired.leteth; i++) {
          Aedo(l fbund = fayse;
            for (uint j = 0; j <es32 indexed cour.lengths j++) {eId, bytes32 indexed prerequisiteId);
         if(reqired[] ==cmpleedouss[j]) {
                    foun = true;
                    break;
                }
            }
            f (!found) reu fals
        }
    consrettru cruewnable(msg.sender) {}

    // University Management
    function addUniversity(string memory name) external onlyOwner {
        bytes32 universityId = keccak256(abi.encodePacked(name));
        require(!universities[universityId].isVerified, "University exists");
        
        universities[universityId] = University({
            id: universityId,
            name: name,
            isVerified: true
        });
        
        emit UniversityAdded(universityId, name);
    }

    // Course Management
    function addCourse(
        string memory courseCode,
        string memory name,
        uint8 credits,
        bytes32 universityId,
        string memory metadataURI
    ) external onlyOwner {
        require(universities[universityId].isVerified, "Invalid university");
        
        bytes32 courseId = keccak256(abi.encodePacked(courseCode, universityId));
        require(!courses[courseId].isActive, "Course exists");

        courses[courseId] = Course({
            courseId: courseId,
            name: name,
            credits: credits,
            universityId: universityId,
            prerequisites: new bytes32[](0),
            metadataURI: keccak256(abi.encodePacked(metadataURI)),
            isActive: true
        });

        emit CourseAdded(courseId, name, universityId);
    }

    function addPrerequisite(bytes32 courseId, bytes32 prerequisiteId) external onlyOwner {
        require(courses[courseId].isActive, "Course not found");
        require(courses[prerequisiteId].isActive, "Prerequisite not found");
        require(!prerequisiteGraph[courseId][prerequisiteId], "Prerequisite exists");

        prerequisiteGraph[courseId][prerequisiteId] = true;
        courses[courseId].prerequisites.push(prerequisiteId);
        
        emit PrerequisiteAdded(courseId, prerequisiteId);
    }

    // View Functions
    function getCourse(bytes32 courseId) external view returns (
        string memory name,
        uint8 credits,
        bytes32 universityId,
        bytes32[] memory prerequisites,
        bytes32 metadataURI,
        bool isActive
    ) {
        Course memory course = courses[courseId];
        require(course.isActive, "Course not found");
        
        return (
            course.name,
            course.credits,
            course.universityId,
            course.prerequisites,
            course.metadataURI,
            course.isActive
        );
    }

    function validatePrerequisites(bytes32 courseId, bytes32[] calldata completedCourses) 
        external 
        view 
        returns (bool) 
    {
        require(courses[courseId].isActive, "Course not found");
        
        bytes32[] memory required = courses[courseId].prerequisites;
        for (uint i = 0; i < required.length; i++) {
            bool found = false;
            for (uint j = 0; j < completedCourses.length; j++) {
                if (required[i] == completedCourses[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }
}