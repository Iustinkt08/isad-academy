type Block = { type: 'p'; text: string } | { type: 'ul'; items: string[] }
type Section = { heading: string; blocks: Block[] }
type Content = { title: string; intro: string; sections: Section[] }

const terms: { en: Content; ro: Content } = {
  en: {
    title: 'GENERAL TERMS AND CONDITIONS OF USE FOR THE ISAD.academy PLATFORM',
    intro: '',
    sections: [
      {
        heading: '1. General Information About the Platform and the Service Provider',
        blocks: [
          { type: 'p', text: 'This document sets forth the general terms and conditions applicable to accessing and using the website https://isad.academy, as well as to the purchase and use of the educational, professional, and digital services offered through it.' },
          { type: 'p', text: 'The website https://isad.academy, hereinafter referred to as the “Website” or “ISAD.academy Platform,” is operated by:' },
          { type: 'p', text: 'INTERNATIONAL SECURITY AND DEFENCE S.R.L., a limited liability company organized and operating in accordance with Romanian law, with its registered office in Teişori, 6 Stejarului Street, Postal Code 87033, registered with the Trade Registry Office under No. J52/935/2021, with unique registration code 44849076, hereinafter referred to as “ISAD,” “ISAD.academy,” “the Provider,” or “the Service Provider.”' },
          { type: 'p', text: 'Contact information:' },
          { type: 'ul', items: ['website: https://isad.academy;', 'email: contact@isad.academy;', 'phone: 40727 392 392;', 'mailing address: One Cotroceni Park, 44 Sergent Nutu Ion Street, Building CT3, Apartment 322.', 'By accessing the Site, creating an account, registering for a course or event, purchasing a subscription, or using any other service offered through the Platform, the User confirms that they have read, understood, and accepted these Terms and Conditions.'] },
          { type: 'p', text: 'Individuals who do not agree with the provisions of this document must cease using the Site and must not purchase or use ISAD.academy’s Services.' },
        ],
      },
      {
        heading: '2. About ISAD.academy',
        blocks: [
          { type: 'p', text: 'ISAD.academy is an educational and professional development platform operated by INTERNATIONAL SECURITY AND DEFENCE S.R.L.' },
          { type: 'p', text: 'The platform may offer programs and activities in areas such as:' },
          { type: 'ul', items: ['artificial intelligence;', 'data analysis and data science;', 'cybersecurity;', 'fraud prevention and investigation;', 'security and defense;', 'compliance, risk management, and governance;', 'investigations and financial crime;', 'management and leadership;', 'digital transformation;', 'technical and professional skills;', 'other related educational or professional fields.'] },
          { type: 'p', text: 'ISAD.academy services may include, but are not limited to:' },
          { type: 'ul', items: ['live online courses;', 'recorded online courses;', 'in-person courses;', 'hybrid courses;', 'webinars;', 'workshops;', 'seminars;', 'conferences;', 'masterclasses;', 'boot camps;', 'mentoring programs;', 'coaching sessions;', 'consulting sessions;', 'assessments and tests;', 'hands-on projects;', 'professional communities;', 'access to digital resources;', 'professional development programs;', 'monthly or annual subscriptions;', 'access to event recordings;', 'certificates of participation or completion;', 'other products or services described on the Site.'] },
          { type: 'p', text: 'The description, structure, duration, instructors, price, access period, and specific terms and conditions for each Service are presented on the respective Service page, in the commercial offer, in the registration form, or in communications sent to the User.' },
        ],
      },
      {
        heading: '3. Terms and Definitions',
        blocks: [
          { type: 'p', text: 'For the purposes of these Terms and Conditions:' },
          { type: 'p', text: '3.1. Provider' },
          { type: 'p', text: '“Provider,” “Service Provider,” “ISAD,” or “ISAD.academy” means INTERNATIONAL SECURITY AND DEFENCE S.R.L.' },
          { type: 'p', text: '3.2. User' },
          { type: 'p', text: '“User” means any natural or legal person who accesses the Site, creates an account, requests information, registers, purchases, or uses one of the Services offered by the Provider.' },
          { type: 'p', text: '3.3. Consumer' },
          { type: 'p', text: '“Consumer” means a natural person acting for purposes outside the scope of their commercial, industrial, manufacturing, artisanal, or professional activities, as defined by applicable consumer protection legislation.' },
          { type: 'p', text: '3.4. The Client' },
          { type: 'p', text: '“Client” means the natural or legal person who contracts for and pays for a Service, regardless of whether the Service is used by the Client or by another person designated by the Client.' },
          { type: 'p', text: '3.5. Participant' },
          { type: 'p', text: '“Participant” means the person who actually participates in a course, webinar, conference, mentoring program, or other Event.' },
          { type: 'p', text: 'The Client and the Participant may be the same person or different persons.' },
          { type: 'p', text: '3.6. Payer' },
          { type: 'p', text: '“Payer” means the User, the Client, or a third-party individual or legal entity that pays the price of a Service on behalf of the Participant.' },
          { type: 'p', text: '3.7. The Service' },
          { type: 'p', text: '“Service” means any course, program, subscription, event, session, digital access, resource, or other service offered by the Provider, whether free of charge or for a fee.' },
          { type: 'p', text: '3.8. Event' },
          { type: 'p', text: '“Event” means any course, training, webinar, seminar, workshop, conference, masterclass, bootcamp, lecture, mentoring session, consulting session, or other similar activity organized or provided by the Provider.' },
          { type: 'p', text: '3.9. Digital Content' },
          { type: 'p', text: '“Digital Content” means any material made available in digital format, including video courses, audio recordings, presentations, PDF files, documents, guides, case studies, databases, tests, exercises, source code, notebooks, templates, infographics, images, charts, software, applications, or other educational resources.' },
          { type: 'p', text: '3.10. LMS' },
          { type: 'p', text: '“Learning Management System” or “LMS” means the ISAD.academy Platform or any other digital system used by the Provider to deliver courses, manage accounts, distribute materials, conduct assessments, issue certificates, and communicate with Users.' },
          { type: 'p', text: 'The Provider may also use, as appropriate, platforms provided by third parties, such as videoconferencing platforms, e-learning systems, cloud services, collaboration applications, or other digital tools.' },
          { type: 'p', text: '3.11. Personal Account' },
          { type: 'p', text: '“Personal Account” means the individual section of the Platform or the LMS to which the User gains access using their login credentials.' },
          { type: 'p', text: '3.12. Instructor' },
          { type: 'p', text: '“Instructor” means the educator, trainer, speaker, mentor, consultant, expert, or collaborator who delivers a Service in whole or in part.' },
          { type: 'p', text: '3.13. Community' },
          { type: 'p', text: '“Community” means any group, forum, communication channel, or digital space made available to Users, including groups organized via WhatsApp, Telegram, Facebook, LinkedIn, Discord, Slack, or other similar platforms.' },
          { type: 'p', text: '3.14. Terms and Conditions' },
          { type: 'p', text: '“Terms and Conditions” or “Terms” means this document, together with the policies and special conditions to which it refers.' },
        ],
      },
      {
        heading: '4. Applicability of the Terms and Formation of the Contract',
        blocks: [
          { type: 'p', text: 'These Terms apply to all Users of the Site and to all contracts regarding the Services offered by ISAD.academy.' },
          { type: 'p', text: 'The contract between the Provider and the Client is deemed to be concluded when at least one of the following situations occurs:' },
          { type: 'ul', items: ['The Client places an order through the Site;', 'The Client pays the price of the Service in full or in part;', 'The Provider confirms the registration in writing;', 'The Client accepts a commercial offer issued by the Provider;', 'The Customer signs a separate contract;', 'The Customer requests that the Service begin;', 'The Customer accesses a free Service subject to acceptance of the Terms.'] },
          { type: 'p', text: 'If there are special contractual terms for a particular Service, they supplement these Terms.' },
          { type: 'p', text: 'In the event of a conflict between these Terms and an individual contract signed between the parties, the individual contract shall prevail, to the extent permitted by law.' },
        ],
      },
      {
        heading: '5. Eligibility and Age Requirements',
        blocks: [
          { type: 'p', text: 'Users must have the legal capacity required to enter into contracts.' },
          { type: 'p', text: 'Persons under the age of 16 may not create a personal Account on their own and may not purchase Services without the consent and involvement of their legal representative.' },
          { type: 'p', text: 'If a minor participates in a Service, registration and payment must be made by the legal representative or with the legal representative’s express consent.' },
          { type: 'p', text: 'The Provider may refuse or revoke a minor’s access if it reasonably determines that the Service is not age-appropriate or if the legal representative’s consent has not been obtained.' },
        ],
      },
      {
        heading: '6. Creating and Using a Personal Account',
        blocks: [
          { type: 'p', text: 'To access certain Services, the User may be required to create a Personal Account.' },
          { type: 'p', text: 'The User must provide true, complete, accurate, and up-to-date information, including:' },
          { type: 'ul', items: ['first and last name;', 'email address;', 'phone number;', 'billing information;', 'the name and details of the legal entity, if applicable;', 'any other information necessary to provide the Service.'] },
          { type: 'p', text: 'The User is responsible for:' },
          { type: 'ul', items: ['maintaining the confidentiality of their login credentials;', 'all activities performed through their Account;', 'using a secure password;', 'not disclosing their login credentials to others;', 'immediately notifying the Provider in the event of unauthorized use.'] },
          { type: 'p', text: 'The Account and the right of access are personal and may not be transferred, resold, lent, or shared with third parties.' },
          { type: 'p', text: 'The Provider may temporarily suspend or deactivate the Account if there are reasonable grounds to believe that:' },
          { type: 'ul', items: ['sharing access with other people;', 'unauthorized use;', 'infringement of intellectual property rights;', 'attempts at fraud;', 'a violation of these Terms;', 'failure to pay amounts due;', 'compromising the security of the Platform;', 'abusive conduct toward lecturers, employees, or other Participants.'] },
          { type: 'p', text: 'To the extent possible, the User will be informed of the reason for the suspension or deactivation.' },
        ],
      },
      {
        heading: '7. Registration for Courses and Events',
        blocks: [
          { type: 'p', text: 'Registration can be completed by:' },
          { type: 'ul', items: ['filling out the form available on the Site;', 'creating a personal Account;', 'purchasing a Service directly;', 'accepting a commercial offer;', 'submitting a request via email;', 'registering through a partner;', 'any other procedure indicated by the Provider.'] },
          { type: 'p', text: 'Registration is considered confirmed only after the conditions communicated for the respective Service have been met, which may include:' },
          { type: 'ul', items: ['confirmation sent by the Provider;', 'full or partial payment of the price;', 'acceptance of the Terms;', 'provision of the necessary information;', 'fulfillment of any admission requirements.'] },
          { type: 'p', text: 'The number of spots may be limited.' },
          { type: 'p', text: 'The provider may refuse a registration, with justification, if:' },
          { type: 'ul', items: ['the maximum number of participants has been reached;', 'payment has not been made;', 'the User has previously breached their contractual obligations;', 'participation could interfere with the smooth running of the Event;', 'the minimum participation requirements have not been met;', 'there are security, compliance, or integrity concerns.'] },
        ],
      },
      {
        heading: '8. Description and Organization of the Services',
        blocks: [
          { type: 'p', text: 'The Provider will use reasonable efforts to ensure that the information published about the Services is accurate and up-to-date.' },
          { type: 'p', text: 'For each Service, the following may be communicated:' },
          { type: 'ul', items: ['objectives;', 'the curriculum;', 'the level of difficulty;', 'prerequisites;', 'date and schedule;', 'duration;', 'format;', 'instructors;', 'price;', 'access period;', 'assessment method;', 'certification requirements;', 'included resources;', 'technical requirements.'] },
          { type: 'p', text: 'Images, promotional materials, descriptions, and presentations are for informational purposes only. The Provider may reasonably adapt the structure or order of the modules, exercises, examples, and teaching methods without materially altering the subject matter of the Service.' },
          { type: 'p', text: 'The Provider does not guarantee that participation in a Service will result in:' },
          { type: 'ul', items: ['employment;', 'a career advancement;', 'an increase in income;', 'obtaining an external certification;', 'admission to an organization;', 'securing funding;', 'achieving a certain level of performance;', 'achieving a specific economic or professional result.'] },
          { type: 'p', text: 'Results depend, among other things, on the Participant’s preparation, commitment, experience, and individual effort.' },
        ],
      },
      {
        heading: '9. Method of Delivery',
        blocks: [
          { type: 'p', text: 'Services may be provided:' },
          { type: 'ul', items: ['in person;', 'online, live;', 'online, via recorded materials;', 'in a hybrid format;', 'through an LMS;', 'via videoconferencing platforms;', 'via email;', 'through Communities;', 'through other means communicated to the User.'] },
          { type: 'p', text: 'The User is responsible for providing the necessary equipment and technical conditions, such as:' },
          { type: 'ul', items: ['a compatible computer, tablet, or phone;', 'a stable internet connection;', 'a working email address;', 'an up-to-date browser;', 'necessary software and applications;', 'camera and microphone, if required;', 'compliance with the technical requirements specified for the course.'] },
          { type: 'p', text: 'The Provider is not liable for any inability to access the Service caused exclusively by the User’s equipment, connection, software, or settings.' },
        ],
      },
      {
        heading: '10. Third-Party Platforms and Providers',
        blocks: [
          { type: 'p', text: 'To provide the Services, the Provider may use services or platforms operated by third parties.' },
          { type: 'p', text: 'The User may also be subject to the terms of those providers.' },
          { type: 'p', text: 'The Provider does not fully control the availability, operation, or policies of third-party platforms and is not liable for any interruptions or malfunctions caused exclusively by them.' },
          { type: 'p', text: 'In the event of a significant malfunction, the Provider will make reasonable efforts to:' },
          { type: 'ul', items: ['resume operations;', 'switch to a different platform;', 'reschedule the session;', 'provide a recording;', 'offer an appropriate alternative solution.'] },
        ],
      },
      {
        heading: '11. Access Period',
        blocks: [
          { type: 'p', text: 'The access period for each course, material, recording, Community, or other Service is as indicated on the overview page, in the commercial offer, in the enrollment confirmation, or in the individual contract.' },
          { type: 'p', text: 'The access period may be, as applicable:' },
          { type: 'ul', items: ['limited to the duration of the Event;', '30, 60, or 90 days;', '6 or 12 months;', 'valid for the duration of an active subscription;', 'as specified in an individual contract;', 'granted for another period communicated prior to purchase.'] },
          { type: 'p', text: 'Unless a specific period is indicated, access to the digital materials associated with a course is granted for a period of 12 months from the date of activation, with the exception of materials made available exclusively for download.' },
          { type: 'p', text: 'The Provider is not obligated to maintain the Website, the Account, the materials, the records, or access to a Service for an indefinite period.' },
          { type: 'p', text: 'The User is responsible for reviewing and, when downloading is permitted, saving the materials during the access period.' },
        ],
      },
      {
        heading: '12. Subscriptions',
        blocks: [
          { type: 'p', text: 'Certain Services may be offered on a monthly, quarterly, or annual subscription basis.' },
          { type: 'p', text: 'Subscription terms, including:' },
          { type: 'ul', items: ['price;', 'the term;', 'benefits;', 'invoice date;', 'whether the service is recurring or non-recurring;', 'cancellation terms;', 'any promotional periods,'] },
          { type: 'p', text: 'will be presented prior to purchase.' },
          { type: 'p', text: 'For recurring subscriptions, the User will be clearly informed prior to payment regarding the recurring nature of the subscription.' },
          { type: 'p', text: 'In the event of subscription cancellation, the User may continue to use the Service until the end of the period already paid for, unless:' },
          { type: 'ul', items: ['otherwise specified in the subscription offer;', 'access is revoked as a result of a breach of contract;', 'the law requires a different solution.'] },
          { type: 'p', text: 'Amounts paid for subscription periods that have already begun are not refunded on a pro-rata basis, except in cases provided for by law or expressly accepted by the Provider.' },
          { type: 'p', text: 'The Provider may change the price of a subscription for future periods, provided the User is notified in advance. The change does not affect the period for which payment has already been made.' },
        ],
      },
      {
        heading: '13. Prices, Billing, and Payment',
        blocks: [
          { type: 'p', text: 'The price of each Service is the one displayed on the Site or stated in the commercial offer.' },
          { type: 'p', text: 'Prices may be expressed in RON, EUR, or another specified currency.' },
          { type: 'p', text: 'The Provider will inform the Customer whether the price:' },
          { type: 'ul', items: ['includes VAT;', 'does not include VAT;', 'qualifies for an exemption or a special tax regime;', 'involves additional fees.'] },
          { type: 'p', text: 'Payment can be made via:' },
          { type: 'ul', items: ['credit card;', 'bank transfer;', 'a payment processor;', 'payment link;', 'installment payments;', 'any other method communicated by the Provider.'] },
          { type: 'p', text: 'Payment processing may be carried out by third-party providers. The Provider does not necessarily store the full bank card details.' },
          { type: 'p', text: 'The Provider’s obligation to provide the Service arises upon confirmation of payment or upon fulfillment of the conditions set forth in the commercial offer.' },
          { type: 'p', text: 'The invoice is issued based on the information provided by the Customer. The Customer is responsible for the accuracy of the billing information.' },
        ],
      },
      {
        heading: '14. Installment Payments and Advance Payments',
        blocks: [
          { type: 'p', text: 'When payment in installments is permitted, the Customer must comply with the specified due dates.' },
          { type: 'p', text: 'If an installment is not paid on time, the Provider may:' },
          { type: 'ul', items: ['suspend access to the Service;', 'postpone the issuance of the certificate;', 'suspend access to materials;', 'demand full payment of the amounts due;', 'terminate the contract, in accordance with the law.'] },
          { type: 'p', text: 'If the Customer pays a deposit to reserve a spot and subsequently cancels for reasons not attributable to the Provider, the deposit may be retained to the extent that this was previously communicated and is permitted by law.' },
          { type: 'p', text: 'For Consumers, the provisions regarding advance payments and cancellation apply without limiting the mandatory rights granted by consumer protection laws.' },
        ],
      },
      {
        heading: '15. Discounts, Vouchers, and Promotional Campaigns',
        blocks: [
          { type: 'p', text: 'The Provider may offer discounts, vouchers, grants, promotional access, or other benefits.' },
          { type: 'p', text: 'These:' },
          { type: 'ul', items: ['are valid during the specified period;', 'cannot be redeemed for cash;', 'cannot be transferred, unless otherwise specified;', 'cannot be combined, unless expressly provided for;', 'may be subject to certain conditions;', 'may be revoked in the event of fraudulent use.'] },
          { type: 'p', text: 'The Provider may correct obvious pricing errors by notifying the Customer and offering the option to confirm the order at the correct price or to request its cancellation.' },
        ],
      },
      {
        heading: '16. The Consumer’s Legal Right of Withdrawal',
        blocks: [
          { type: 'p', text: 'In the case of distance contracts, the Consumer generally has the right to withdraw from the contract within 14 days without having to justify their decision, subject to the conditions and exceptions provided for by applicable law.' },
          { type: 'p', text: 'The withdrawal period begins, as applicable, on the date the contract is concluded.' },
          { type: 'p', text: 'To exercise the right of withdrawal, the Consumer must send an unequivocal statement to the following address:' },
          { type: 'p', text: 'support@isad.academy' },
          { type: 'p', text: 'or via another method made available on the Website.' },
          { type: 'p', text: 'The notification must allow for the identification of the Customer and the purchased Service.' },
          { type: 'p', text: 'The Consumer may use the following template:' },
          { type: 'p', text: '“I hereby notify you of my withdrawal from the contract regarding the following Service: [SERVICE NAME], ordered on [DATE]. Consumer’s name: [NAME]. Address: [ADDRESS]. Date: [DATE].”' },
          { type: 'p', text: 'Use of this template is not mandatory.' },
        ],
      },
      {
        heading: '17. Commencement of the Service Before the Expiration of the Withdrawal Period',
        blocks: [
          { type: 'p', text: 'If a Consumer requests that the provision of a Service begin within the 14-day period, the Provider may require an express request to that effect.' },
          { type: 'p', text: 'If the Consumer subsequently exercises their right of withdrawal, they may be required to pay an amount proportional to the portion of the Service provided up to the time of withdrawal, in accordance with the law.' },
          { type: 'p', text: 'If the Service has been fully performed during the withdrawal period, and performance began with the Consumer’s prior express consent and after confirmation that the Consumer understands they will lose their right of withdrawal upon full performance, the right of withdrawal may cease in accordance with the law.' },
        ],
      },
      {
        heading: '18. Digital Content and Loss of the Right of Withdrawal',
        blocks: [
          { type: 'p', text: 'For digital content that is not delivered on a tangible medium, delivery may begin immediately after purchase only under the conditions provided by law.' },
          { type: 'p', text: 'Before immediate access is activated, the Consumer may be required to provide:' },
          { type: 'ul', items: ['express prior consent to begin delivery before the 14-day period expires;', 'confirmation that they understand that, by commencing delivery, they may lose their right of withdrawal;', 'confirmation of the contract on a durable medium.'] },
          { type: 'p', text: 'If these conditions are met, the Consumer may no longer exercise the right of withdrawal for Digital Content whose supply has begun.' },
          { type: 'p', text: 'Simply accessing a live course or a portion of a Service does not automatically waive the Consumer’s rights, except in the situations and under the conditions provided by law.' },
        ],
      },
      {
        heading: '19. Commercial Cancellation and Refund Policy',
        blocks: [
          { type: 'p', text: 'In addition to statutory rights, the Provider may offer a commercial cancellation or refund policy for certain Services.' },
          { type: 'p', text: 'The specific terms will be indicated on the Service page or in the commercial offer.' },
          { type: 'p', text: 'Unless otherwise specified, the following rules apply:' },
          { type: 'p', text: '19.1. Scheduled Courses and Events' },
          { type: 'p', text: 'The Customer may request cancellation of participation by written notice.' },
          { type: 'p', text: 'Depending on the timing of the notice, the Provider may offer:' },
          { type: 'ul', items: ['a full refund;', 'a partial refund;', 'transfer to a future session;', 'a voucher;', 'replacement of the Participant;', 'access to the recording, if available.'] },
          { type: 'p', text: 'The solution will take into account costs already incurred, the nature of the Service, and applicable legal provisions.' },
          { type: 'p', text: '19.2. Participant’s Failure to Attend' },
          { type: 'p', text: 'Failure to attend a confirmed Event does not automatically entitle the Participant to a refund.' },
          { type: 'p', text: 'If possible, the Provider may offer access to the recording, a transfer to a future edition, or another benefit, without this constituting a general obligation.' },
          { type: 'p', text: '19.3. Customized Services' },
          { type: 'p', text: 'Amounts paid for customized services, consulting, mentoring, coaching, or programs developed according to the Client’s requirements may be non-refundable once preparation or execution has begun, to the extent permitted by law.' },
          { type: 'p', text: '19.4. Accessed Digital Content' },
          { type: 'p', text: 'Once the Digital Content has been activated and accessed, a refund may be denied if the legal conditions regarding the loss of the right of withdrawal are met.' },
          { type: 'p', text: 'This commercial policy does not limit the Consumer’s mandatory legal rights.' },
        ],
      },
      {
        heading: '20. Cancellation or Rescheduling by the Provider',
        blocks: [
          { type: 'p', text: 'The Provider may modify, reschedule, or cancel a Service for reasons such as:' },
          { type: 'ul', items: ['the Instructor’s unavailability;', 'insufficient number of participants;', 'technical issues;', 'health reasons;', 'force majeure;', 'legal or administrative requirements;', 'external events that make it impossible or unreasonable to hold the event;', 'other objective reasons.'] },
          { type: 'p', text: 'In the event of rescheduling, the Provider will inform the Participants and communicate the new date within a reasonable timeframe.' },
          { type: 'p', text: 'If the change is significant and the new date is not suitable for the Participant, the Provider may offer, as appropriate:' },
          { type: 'ul', items: ['transfer to a future edition;', 'a voucher;', 'an equivalent Service;', 'access to the recording;', 'a refund of the amounts paid for the unperformed portion.'] },
          { type: 'p', text: 'In the event of a definitive cancellation by the Provider, the Customer is entitled to a refund of the amounts paid for the canceled Service, unless the Customer accepts an alternative.' },
          { type: 'p', text: 'The refund will generally be made via the same payment method or to the account specified by the Customer, within a reasonable timeframe and within the time limits provided by law.' },
          { type: 'p', text: 'The Service Provider’s liability for the cancellation of a Service shall not, in principle, exceed the amount paid for that Service, without prejudice to rights that cannot be legally limited.' },
        ],
      },
      {
        heading: '21. Replacement of Instructors and Schedule Changes',
        blocks: [
          { type: 'p', text: 'The Service Provider may replace a Lecturer with another specialist having relevant experience when such replacement is necessary for objective reasons.' },
          { type: 'p', text: 'The Provider may adjust:' },
          { type: 'ul', items: ['the order of the modules;', 'time slots;', 'the examples;', 'the exercises;', 'teaching methods;', 'resources;', 'the format of certain sessions,'] },
          { type: 'p', text: 'provided that the overall purpose and value of the Service are not significantly diminished.' },
        ],
      },
      {
        heading: '22. Certificates',
        blocks: [
          { type: 'p', text: 'Depending on the Service and the terms provided, the Participant may receive:' },
          { type: 'ul', items: ['a certificate of participation;', 'a certificate of completion;', 'a certificate of completion;', 'a symbolic diploma;', 'a digital badge;', 'other document issued by the Provider or a partner.'] },
          { type: 'p', text: 'The issuance of the certificate may be contingent upon:' },
          { type: 'ul', items: ['participation in a certain percentage of sessions;', 'completion of certain tests;', 'submission of a project;', 'achieving a minimum score;', 'full payment of the fee;', 'compliance with the program rules.'] },
          { type: 'p', text: 'Certificates issued by ISAD.academy serve as proof of participation in or completion of a program organized by the Provider.' },
          { type: 'p', text: 'They do not constitute state-recognized diplomas and do not automatically confer a regulated professional qualification, unless accreditation or recognition is expressly mentioned in the program description.' },
          { type: 'p', text: 'When a program is conducted in collaboration with a certifying body, an accredited institution, or an external partner, the terms and conditions and recognition of the certificate will be presented separately.' },
        ],
      },
      {
        heading: '23. Assessments, Assignments, and Academic Integrity',
        blocks: [
          { type: 'p', text: 'Users must complete tests, projects, and assignments honestly.' },
          { type: 'p', text: 'The following are prohibited:' },
          { type: 'ul', items: ['plagiarism;', 'copying the work of others;', 'presenting material created entirely by others as one’s own;', 'falsifying results;', 'providing answers to other participants;', 'unauthorized use of confidential materials;', 'manipulation of assessment systems.'] },
          { type: 'p', text: 'The use of artificial intelligence-based tools is permitted only to the extent indicated by the Instructor or the program rules.' },
          { type: 'p', text: 'The Provider may require the Participant to disclose the use of artificial intelligence systems and to explain their own contribution.' },
          { type: 'p', text: 'In the event of a violation of the integrity rules, the Provider may:' },
          { type: 'ul', items: ['require the assignment to be redone;', 'invalidate the result;', 'deny certification;', 'suspend access;', 'exclude the Participant from the program.'] },
        ],
      },
      {
        heading: '24. Use of Artificial Intelligence Systems',
        blocks: [
          { type: 'p', text: 'The Provider may use artificial intelligence-based systems to:' },
          { type: 'ul', items: ['recommend resources;', 'organize materials;', 'providing educational assistance;', 'generating exercises;', 'analyzing feedback;', 'automating communications;', 'facilitating the learning process;', 'improving the Services.'] },
          { type: 'p', text: 'Responses generated by artificial intelligence systems may contain errors, omissions, or inaccurate information and must be verified by the User.' },
          { type: 'p', text: 'AI-generated or AI-assisted materials do not constitute individualized legal, tax, medical, financial, security, or professional advice.' },
          { type: 'p', text: 'The User must not enter the following into the AI tools provided through the course:' },
          { type: 'ul', items: ['sensitive personal data;', 'classified information;', 'trade secrets;', 'confidential employer data;', 'credentials;', 'passwords;', 'information belonging to unauthorized third parties.'] },
          { type: 'p', text: 'The Service Provider may adopt additional rules regarding the responsible use of artificial intelligence.' },
        ],
      },
      {
        heading: '25. Communities and Communication Groups',
        blocks: [
          { type: 'p', text: 'Participants may be granted access to Communities administered by the Provider.' },
          { type: 'p', text: 'Within the Communities, the User must adhere to:' },
          { type: 'ul', items: ['civilized language;', 'the rights of others;', 'confidentiality;', 'copyright;', 'the moderators’ instructions;', 'the educational or professional purpose of the group.'] },
          { type: 'p', text: 'The following are prohibited:' },
          { type: 'ul', items: ['harassment;', 'threats;', 'discriminatory speech;', 'unsolicited advertising;', 'repeated messages;', 'distribution of course materials;', 'collecting members\' data without consent;', 'transmission of malware;', 'promoting illegal activities;', 'aggressively contacting members;', 'using the Community for recruitment or sales without permission.'] },
          { type: 'p', text: 'The Provider may moderate, hide, or delete content that violates the rules and may remove the User from the Community.' },
          { type: 'p', text: 'Removal from the Community does not automatically result in a refund of the Service fee if the action was due to the User’s conduct.' },
        ],
      },
      {
        heading: '26. Content Uploaded by the User',
        blocks: [
          { type: 'p', text: 'The User may upload or transmit:' },
          { type: 'ul', items: ['themes;', 'projects;', 'questions;', 'comments;', 'images;', 'audio and video materials;', 'feedback;', 'other materials.'] },
          { type: 'p', text: 'The User retains the rights to their own content.' },
          { type: 'p', text: 'By uploading content to the Platform, the User grants the Provider a non-exclusive, royalty-free license, limited to the period and purposes necessary for:' },
          { type: 'ul', items: ['providing the Service;', 'evaluating the work;', 'display within the relevant educational group;', 'storage and technical administration;', 'preventing fraud and plagiarism;', 'resolving complaints;', 'compliance with legal obligations.'] },
          { type: 'p', text: 'The User’s content will not be used for promotional purposes outside the educational context without an appropriate legal basis and, where necessary, without the User’s consent.' },
          { type: 'p', text: 'The User declares that:' },
          { type: 'ul', items: ['they hold the necessary rights to the material;', 'the material does not infringe on the rights of others;', 'the material does not contain illegal information;', 'its publication or transmission does not violate any confidentiality obligations.'] },
        ],
      },
      {
        heading: '27. General Rules for Use of the Site',
        blocks: [
          { type: 'p', text: 'The User agrees not to use the Site or the Services:' },
          { type: 'ul', items: ['for illegal purposes;', 'to infringe upon the rights of others;', 'to distribute offensive, violent, discriminatory, or obscene content;', 'for harassment, threats, or defamation;', 'to send spam;', 'for introducing viruses, malware, or malicious code;', 'for unauthorized access to accounts or systems;', 'for testing vulnerabilities without authorization;', 'to collect other Users’ data;', 'for automatically copying or extracting Content;', 'to resell access;', 'to circumvent technical security measures;', 'to disrupt the operation of the Platform.'] },
          { type: 'p', text: 'The User may not use robots, crawlers, scraping applications, or other automated means to copy or extract Content without the Provider’s written consent.' },
        ],
      },
      {
        heading: '28. Intellectual Property Rights',
        blocks: [
          { type: 'p', text: 'The Website and the Content made available through ISAD.academy are protected by laws governing copyright, trademarks, databases, trade secrets, and other intellectual property rights.' },
          { type: 'p', text: 'These rights may belong to:' },
          { type: 'ul', items: ['the Provider;', 'Lecturers;', 'Partners;', 'technology providers;', 'other designated rights holders.'] },
          { type: 'p', text: '“Content” includes, but is not limited to:' },
          { type: 'ul', items: ['texts;', 'presentations;', 'course materials;', 'recordings;', 'video and audio materials;', 'images;', 'infographics;', 'charts;', 'exercises;', 'quizzes;', 'databases;', 'methodologies;', 'case studies;', 'code;', 'applications;', 'models;', 'course outlines;', 'logos;', 'brands;', 'the Website’s design.'] },
          { type: 'p', text: 'Purchasing a Service does not transfer ownership of the Content to the User.' },
          { type: 'p', text: 'The User receives only a limited, personal, non-exclusive, non-transferable, and revocable right to access the Content for their own educational use during the specified period.' },
        ],
      },
      {
        heading: '29. Prohibited Uses of Materials',
        blocks: [
          { type: 'p', text: 'Without the written consent of the rights holder, the User is prohibited from:' },
          { type: 'ul', items: ['copy the materials;', 'record the courses;', 'photograph or capture the content in its entirety;', 'reproduce the materials;', 'distribute them to others;', 'publish them online;', 'to upload them to file-sharing platforms;', 'resell them;', 'to rent them;', 'translate and distribute them;', 'modify them;', 'remove trademarks or copyright notices;', 'to create competing courses by substantially reproducing the structure or content;', 'to input the materials into artificial intelligence systems for training, reproduction, indexing, or the generation of competing materials;', 'use the Content in commercial databases;', 'share access credentials.'] },
          { type: 'p', text: 'Downloading is permitted only for materials marked as downloadable and exclusively for personal use.' },
          { type: 'p', text: 'The user may take personal notes and use the knowledge gained in their professional work, without reproducing or distributing the original materials.' },
        ],
      },
      {
        heading: '30. Recording of Events',
        blocks: [
          { type: 'p', text: 'Certain Events may be audio or video recorded.' },
          { type: 'p', text: 'The Provider will inform Participants, in a reasonable manner, regarding the recording.' },
          { type: 'p', text: 'The recording may include:' },
          { type: 'ul', items: ['the Participant’s voice;', 'the Participant’s image;', 'the Participant’s displayed name;', 'the Participant’s profile photo;', 'questions or comments;', 'materials presented during the session.'] },
          { type: 'p', text: 'Recordings may be made available to:' },
          { type: 'ul', items: ['Event participants;', 'Users who purchase access to the recording;', 'Speakers;', 'staff involved in the organization;', 'other categories indicated before or during the Event.'] },
          { type: 'p', text: 'The recordings will not be used in advertising campaigns that clearly identify the Participant without an appropriate legal basis and, where necessary, without consent.' },
          { type: 'p', text: 'Participants who do not wish to appear in the recording must, to the extent that the format allows:' },
          { type: 'ul', items: ['keep the camera turned off;', 'use a name that does not reveal additional information;', 'submit questions in writing;', 'notify the organizer prior to the Event.'] },
          { type: 'p', text: 'The Provider may prohibit Participants from recording the Event.' },
        ],
      },
      {
        heading: '31. Photographs and Promotional Materials',
        blocks: [
          { type: 'p', text: 'For in-person Events, the Provider may take photographs or general images for the purpose of documenting the activity and promoting the event.' },
          { type: 'p', text: 'When a person is the main subject and can be clearly identified, the Provider will use that person’s image in accordance with applicable law and, where necessary, based on consent.' },
          { type: 'p', text: 'The participant may inform the organizer prior to the Event that they do not wish to be photographed or filmed for promotional purposes.' },
        ],
      },
      {
        heading: '32. Feedback, Testimonials, and Results',
        blocks: [
          { type: 'p', text: 'The User may voluntarily submit feedback or testimonials.' },
          { type: 'p', text: 'The Provider may use anonymous or aggregated feedback to improve the Services.' },
          { type: 'p', text: 'The publication of a testimonial along with the person’s name, image, job title, company, or other identifying information will be carried out only on the basis of an appropriate legal basis and, when necessary, with the person’s consent.' },
          { type: 'p', text: 'The user may request that the use of a testimonial be discontinued, without affecting any lawful use that occurred prior to the request.' },
        ],
      },
      {
        heading: '33. Protection of Personal Data',
        blocks: [
          { type: 'p', text: 'The Provider processes personal data in accordance with applicable data protection laws.' },
          { type: 'p', text: 'Detailed information regarding:' },
          { type: 'ul', items: ['data categories;', 'the purposes of processing;', 'legal bases;', 'recipients;', 'storage period;', 'international transfers;', 'the rights of data subjects;', 'use of cookies;', 'contact information regarding data protection,'] },
          { type: 'p', text: 'are set forth in the Privacy Policy and Cookie Policy, available on the Site.' },
          { type: 'p', text: 'Acceptance of these Terms does not automatically constitute consent to receive commercial communications.' },
          { type: 'p', text: 'Marketing communications will be sent in accordance with the law, and the User may unsubscribe using the mechanism indicated in each communication or by contacting the Provider.' },
          { type: 'p', text: 'The Provider may send communications necessary for the performance of the contract, such as:' },
          { type: 'ul', items: ['order confirmations;', 'invoices;', 'access information;', 'schedule changes;', 'information about the purchased Service;', 'security notifications;', 'administrative information.'] },
        ],
      },
      {
        heading: '34. Confidentiality of Information',
        blocks: [
          { type: 'p', text: 'Within certain Services, Participants, Lecturers, or the Provider may disclose confidential information.' },
          { type: 'p', text: 'The User agrees not to disclose without authorization:' },
          { type: 'ul', items: ['the personal data of other Participants;', 'commercial information;', 'unpublished case studies;', 'customer information;', 'trade secrets;', 'technical data;', 'information marked as confidential;', 'private discussions within groups.'] },
          { type: 'p', text: 'The Service Provider may require the signing of a separate confidentiality agreement for certain programs.' },
          { type: 'p', text: 'The user must anonymize any confidential information used in exercises and projects.' },
        ],
      },
      {
        heading: '35. Information Security',
        blocks: [
          { type: 'p', text: 'The Provider implements reasonable technical and organizational measures to protect the Platform and the data.' },
          { type: 'p', text: 'No IT system can be guaranteed to be completely risk-free.' },
          { type: 'p', text: 'The user must:' },
          { type: 'ul', items: ['use strong passwords;', 'not share their credentials;', 'update their devices and applications;', 'use appropriate security solutions;', 'report any incidents or vulnerabilities they observe;', 'do not attempt to exploit a vulnerability.'] },
          { type: 'p', text: 'Security reports can be submitted to contact@isad.academy' },
        ],
      },
      {
        heading: '36. Website Availability',
        blocks: [
          { type: 'p', text: 'The Provider makes reasonable efforts to maintain the availability of the Site and the Services.' },
          { type: 'p', text: 'Access may be temporarily interrupted for:' },
          { type: 'ul', items: ['maintenance;', 'updates;', 'troubleshooting;', 'security incidents;', 'supplier issues;', 'force majeure;', 'other objective reasons.'] },
          { type: 'p', text: 'The Provider does not guarantee the uninterrupted or error-free operation of the Site.' },
          { type: 'p', text: 'When an interruption significantly affects a purchased Service, the Provider will make reasonable efforts to provide an appropriate solution, such as extending access, rescheduling, or providing an alternative method.' },
        ],
      },
      {
        heading: '37. Compliance of the Services and Reporting Issues',
        blocks: [
          { type: 'p', text: 'The Provider will provide the Services in accordance with the description provided and applicable legal requirements.' },
          { type: 'p', text: 'The User must notify the Provider within a reasonable time of any relevant issue regarding:' },
          { type: 'ul', items: ['inability to access the Services;', 'the absence of promised materials;', 'malfunction;', 'non-compliance of the digital content;', 'billing errors;', 'other deficiencies.'] },
          { type: 'p', text: 'The report must include sufficient information to identify and reproduce the problem.' },
          { type: 'p', text: 'The Provider may request screenshots, device details, browser information, or other reasonable technical information.' },
          { type: 'p', text: 'Depending on the situation and applicable law, the Provider may:' },
          { type: 'ul', items: ['resolve the issue;', 'provide alternative access;', 'replace the content;', 'extend the access period;', 'proportionally reduce the price;', 'terminate the contract;', 'reimburse the amounts owed.'] },
        ],
      },
      {
        heading: '38. Limitation of Liability',
        blocks: [
          { type: 'p', text: 'The Service Provider is liable for direct damages caused by a culpable breach of its obligations, within the limits provided by law.' },
          { type: 'p', text: 'To the extent permitted by law, the Service Provider shall not be liable for:' },
          { type: 'ul', items: ['indirect losses;', 'loss of profits;', 'loss of business opportunities;', 'professional or business decisions made by the User;', 'improper use of information;', 'failure to achieve a specific professional result;', 'malfunctions of the User’s equipment;', 'unavailability of third-party platforms;', 'information entered by the User into external applications;', 'actions of other Participants;', 'the content of third-party websites.'] },
          { type: 'p', text: 'To the extent permitted by law, the Provider’s total liability arising from a particular Service shall not exceed the amount actually paid for that Service.' },
          { type: 'p', text: 'These limitations do not apply in cases where liability cannot be excluded or limited by law, including in cases of intent, gross negligence, bodily injury, or violation of the Consumer’s mandatory rights.' },
        ],
      },
      {
        heading: '39. Informational Nature of the Materials',
        blocks: [
          { type: 'p', text: 'The materials and information provided are for general educational purposes.' },
          { type: 'p', text: 'Unless a separate contract exists, they do not constitute:' },
          { type: 'ul', items: ['legal advice;', 'tax advice;', 'accounting advice;', 'medical advice;', 'financial or investment advice;', 'personalized security advice;', 'guaranteed recommendations for a specific situation.'] },
          { type: 'p', text: 'The user must seek specialized assistance before making decisions with significant legal, financial, medical, security, or professional implications.' },
        ],
      },
      {
        heading: '40. Contributors and Collaborators',
        blocks: [
          { type: 'p', text: 'The services may be provided by independent Lecturers, employees, contributors, or representatives of partners.' },
          { type: 'p', text: 'Personal opinions expressed by Lecturers do not automatically represent the Provider’s official position.' },
          { type: 'p', text: 'Lecturers are required to comply with the contractual framework and the rules of ISAD.academy; however, the Provider cannot guarantee that all of their opinions, examples, or statements are applicable to every individual situation.' },
          { type: 'p', text: 'The Provider may investigate complaints regarding a Lecturer’s conduct and may take the measures it deems appropriate.' },
        ],
      },
      {
        heading: '41. External Links and Resources',
        blocks: [
          { type: 'p', text: 'The website and materials may contain links to websites, tools, articles, applications, or services operated by third parties.' },
          { type: 'p', text: 'The Provider does not control or guarantee:' },
          { type: 'ul', items: ['availability;', 'security;', 'accuracy;', 'legality;', 'privacy policies;', 'terms and conditions'] },
          { type: 'p', text: 'of external resources.' },
          { type: 'p', text: 'Access to these resources is at the User’s own risk and may be subject to the terms of the respective provider.' },
        ],
      },
      {
        heading: '42. Force Majeure and Unforeseeable Circumstances',
        blocks: [
          { type: 'p', text: 'Neither party shall be liable for failure to perform its obligations caused by an event of force majeure or unforeseeable circumstances, as recognized by law.' },
          { type: 'p', text: 'Such events may include, depending on the circumstances:' },
          { type: 'ul', items: ['natural disasters;', 'fires;', 'epidemics;', 'pandemics;', 'armed conflicts;', 'large-scale cyberattacks;', 'major power or communications outages;', 'government measures;', 'general strikes;', 'objective inability to travel;', 'other external, unforeseeable, and unavoidable events.'] },
          { type: 'p', text: 'The affected party shall notify the other party within a reasonable time and shall make every effort to minimize the consequences.' },
        ],
      },
      {
        heading: '43. Suspension and Termination of Access',
        blocks: [
          { type: 'p', text: 'The Provider may suspend or terminate the User’s access if the User:' },
          { type: 'ul', items: ['fails to pay the amounts due;', 'shares the Account;', 'copies or distributes the materials;', 'disrupts the operation of the Service;', 'engages in abusive conduct;', 'violates confidentiality obligations;', 'violate the Community Guidelines;', 'compromise the security of the Platform;', 'engages in illegal activities;', 'materially violates these Terms.'] },
          { type: 'p', text: 'Before terminating access, the Provider may issue a warning and grant a period for rectification, if the nature of the violation permits.' },
          { type: 'p', text: 'In serious cases, access may be suspended immediately.' },
          { type: 'p', text: 'If the termination is due to a willful breach of obligations by the User, the User is not automatically entitled to a refund, without prejudice to mandatory rights provided by law.' },
        ],
      },
      {
        heading: '44. Transfer of Participation',
        blocks: [
          { type: 'p', text: 'Transferring a spot to another person is permitted only with the Provider’s consent and if:' },
          { type: 'ul', items: ['the request is submitted before the Service begins;', 'the new Participant meets the program requirements;', 'Personal digital content has not been accessed;', 'there are no certification restrictions;', 'the necessary data is provided.'] },
          { type: 'p', text: 'The provider may refuse the transfer in the case of personalized services, individual subscriptions, or accounts that have already been activated.' },
        ],
      },
      {
        heading: '45. Communications',
        blocks: [
          { type: 'p', text: 'Communications between the Provider and the User may take place via:' },
          { type: 'ul', items: ['email;', 'phone;', 'text message;', 'WhatsApp;', 'Telegram;', 'notifications on the Platform;', 'other means of communication.'] },
          { type: 'p', text: 'The user must ensure that their contact information is up to date and check their spam or junk folders as well.' },
          { type: 'p', text: 'Notifications regarding the performance of the contract may be sent without marketing consent, as they are necessary for the provision of the Service.' },
        ],
      },
      {
        heading: '46. Complaints',
        blocks: [
          { type: 'p', text: 'Any complaint regarding the services offered through the Platform may be sent to the following email address: support@isad.academy' },
          { type: 'p', text: 'The complaint must include, as applicable:' },
          { type: 'ul', items: ['the Customer’s name;', 'the email address used to place the order;', 'the Service purchased;', 'the invoice or order number;', 'a description of the situation;', 'the requested solution;', 'relevant documents.'] },
          { type: 'p', text: 'The service provider will review the complaint and provide a response within a reasonable timeframe, taking into account the complexity of the situation and the deadlines set forth by law.' },
          { type: 'p', text: 'The parties will seek to resolve any dispute amicably.' },
        ],
      },
      {
        heading: '47. Alternative Dispute Resolution',
        blocks: [
          { type: 'p', text: 'Consumers may use the alternative dispute resolution mechanisms provided by the National Authority for Consumer Protection, in accordance with the law.' },
          { type: 'p', text: 'Up-to-date information regarding the ADR procedure is available on the website of the National Authority for Consumer Protection.' },
          { type: 'p', text: 'The use of an alternative procedure does not affect the Consumer’s right to bring a claim before the competent courts.' },
        ],
      },
      {
        heading: '48. Governing Law and Competent Courts',
        blocks: [
          { type: 'p', text: 'These Terms and the relationship between the Provider and the User are governed by Romanian law and the applicable mandatory rules of the European Union.' },
          { type: 'p', text: 'Any dispute shall first be resolved amicably.' },
          { type: 'p', text: 'If an amicable resolution is not possible, the dispute will be resolved by the competent courts in accordance with the law.' },
          { type: 'p', text: 'In relations with Consumers, these Terms do not limit their right to bring a claim before the competent court established by mandatory consumer protection regulations.' },
          { type: 'p', text: 'For relationships between businesses, the parties may agree in an individual contract that the courts at the Service Provider’s place of business shall have jurisdiction.' },
        ],
      },
      {
        heading: '49. Amendment of the Terms and Conditions',
        blocks: [
          { type: 'p', text: 'The Provider may periodically amend these Terms to reflect:' },
          { type: 'ul', items: ['changes in the law;', 'changes to the Services;', 'the introduction of new features;', 'security requirements;', 'organizational changes;', 'recommendations from authorities;', 'correction of errors.'] },
          { type: 'p', text: 'The updated version will be published on the Site along with the date of the last update.' },
          { type: 'p', text: 'Changes generally apply to uses and purchases made after publication.' },
          { type: 'p', text: 'Significant changes that affect an ongoing Service will be communicated to Users in a reasonable manner and will not retroactively reduce rights already acquired, except as provided by law.' },
        ],
      },
      {
        heading: '50. Partial Invalidity',
        blocks: [
          { type: 'p', text: 'If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining provisions shall remain in full force and effect.' },
          { type: 'p', text: 'The affected provision will be interpreted or replaced, to the extent permitted by law, with a valid provision that most closely reflects its original purpose.' },
        ],
      },
      {
        heading: '51. Waiver of Rights',
        blocks: [
          { type: 'p', text: 'The fact that the Provider does not immediately exercise a right provided for in these Terms does not constitute a waiver of that right.' },
          { type: 'p', text: 'Any waiver is valid only if it is clearly expressed and, where applicable, in writing.' },
        ],
      },
      {
        heading: '52. Entire Agreement',
        blocks: [
          { type: 'p', text: 'These Terms, together with:' },
          { type: 'ul', items: ['Privacy Policy;', 'the Cookie Policy;', 'Delivery Policy;', 'the applicable cancellation policy;', 'Commercial Offer;', 'Order Form;', 'Special Terms and Conditions of the Service;', 'the individual contract, if any,'] },
          { type: 'p', text: 'constitute the contractual framework between the Provider and the User.' },
        ],
      },
      {
        heading: '53. Documents Available on the Site',
        blocks: [
          { type: 'p', text: 'Users are advised to review:' },
          { type: 'ul', items: ['Terms and Conditions;', 'Privacy Policy;', 'Cookie Policy;', 'Delivery and Access Policy;', 'Cancellation and Refund Policy;', 'any Community Rules;', 'Terms specific to each Service.'] },
          { type: 'p', text: 'The current version is the one published on https://isad.academy on the date of use or purchase of the Service.' },
        ],
      },
      {
        heading: '54. Final Identification Information',
        blocks: [
          { type: 'p', text: 'Service Provider: INTERNATIONAL SECURITY AND DEFENCE S.R.L. Trade Name/Platform: ISAD.academy Unique Registration Code: 44849076 General email: contact@isad.academy Email for complaints and withdrawals: support@isad.academy Phone: +40727 392 392 Website: https://isad.academy' },
          { type: 'p', text: 'These Terms and Conditions take effect on July 21, 2026, and remain in effect until replaced by an updated version.' },
          { type: 'p', text: 'INTERNATIONAL SECURITY AND DEFENCE S.R.L. Operator of the ISAD.academy platform' },
        ],
      },
      {
        heading: '55. Corporate Accounts and Enterprise Licenses',
        blocks: [
          { type: 'p', text: 'The Provider may also provide the Services to legal entities, public institutions, nongovernmental organizations, or other entities through corporate licenses or organizational accounts.' },
          { type: 'p', text: 'The administrator designated by the Client may manage participants’ access within the limits of the concluded contract.' },
          { type: 'p', text: 'Corporate licenses are non-transferable and may be used exclusively within the contracting organization.' },
          { type: 'p', text: 'The Provider may limit the number of users, the license term, and the available features in accordance with the commercial offer.' },
        ],
      },
      {
        heading: '56. License to Use the Platform',
        blocks: [
          { type: 'p', text: 'The Provider grants the User a limited, personal, non-exclusive, revocable, and non-transferable license to use the Platform solely for the purpose of accessing the contracted Services.' },
          { type: 'p', text: 'The license does not grant the right to:' },
          { type: 'ul', items: ['modify;', 'decompile;', 'reverse engineer;', 'reproduce;', 'distribute;', 'integration into other products;', 'development of competing products.'] },
        ],
      },
      {
        heading: '57. Export Control and International Sanctions',
        blocks: [
          { type: 'p', text: 'Given that certain Services may address areas such as:' },
          { type: 'ul', items: ['artificial intelligence;', 'cybersecurity;', 'fraud prevention;', 'defense;', 'data analysis;', 'cryptography;'] },
          { type: 'p', text: 'The Provider may refuse to provide the Services when there are obligations arising from:' },
          { type: 'ul', items: ['international sanctions;', 'export control regulations;', 'embargoes;', 'restrictions imposed by European Union law, the UN, or other competent authorities.'] },
          { type: 'p', text: 'The Provider may request additional information to verify the Customer’s eligibility.' },
        ],
      },
      {
        heading: '58. Anti-Piracy Measures',
        blocks: [
          { type: 'p', text: 'The Provider uses technical and organizational measures to protect the Content.' },
          { type: 'p', text: 'These may include:' },
          { type: 'ul', items: ['watermarks;', 'user identification;', 'device restrictions;', 'access logging;', 'detection of unauthorized distribution;', 'automatic suspension of access.'] },
          { type: 'p', text: 'Illegal distribution of materials may result in civil and criminal liability.' },
        ],
      },
      {
        heading: '59. Use of Anonymized Statistics',
        blocks: [
          { type: 'p', text: 'The Provider may use aggregated and anonymized information regarding the use of the Platform to:' },
          { type: 'ul', items: ['improve the Services;', 'develop new programs;', 'compiling statistics;', 'research;', 'reports on the Platform’s activity.'] },
          { type: 'p', text: 'This information does not allow for the identification of Users.' },
        ],
      },
      {
        heading: '60. Archiving and Deleting Accounts',
        blocks: [
          { type: 'p', text: 'The Provider may archive or delete inactive Accounts after the expiration of statutory or contractual periods.' },
          { type: 'p', text: 'Deleting an account does not affect any existing tax, contractual, or legal obligations.' },
          { type: 'p', text: 'The Provider may retain certain data when required by law or when necessary to defend its rights.' },
        ],
      },
      {
        heading: '61. Audit and Compliance',
        blocks: [
          { type: 'p', text: 'For certain Services intended for organizations, the Provider may conduct audits to verify compliance with license terms and the proper use of the Platform.' },
          { type: 'p', text: 'These audits will be conducted in accordance with applicable law and without unduly disrupting the Client’s business operations.' },
        ],
      },
      {
        heading: '62. Code of Conduct',
        blocks: [
          { type: 'p', text: 'All Users must adhere to the principles of:' },
          { type: 'ul', items: ['mutual respect;', 'professionalism;', 'integrity;', 'confidentiality;', 'legality;', 'non-discrimination.'] },
          { type: 'p', text: 'The service provider may adopt a separate Code of Conduct that is mandatory for certain programs.' },
        ],
      },
      {
        heading: '63. Provisions Regarding the Development of the Platform',
        blocks: [
          { type: 'p', text: 'The Provider may modify, expand, reorganize, or remove features of the Platform in order to:' },
          { type: 'ul', items: ['improve the user experience;', 'implement security measures;', 'adapt to changes in legislation;', 'integrate new technologies.'] },
          { type: 'p', text: 'These changes will not unduly affect the rights already acquired by Users.' },
        ],
      },
      {
        heading: '64. Language Versions',
        blocks: [
          { type: 'p', text: 'The Provider may publish the Terms and Conditions in multiple languages.' },
          { type: 'p', text: 'In the event of any discrepancies between versions, the Romanian version shall prevail, unless otherwise required by applicable law.' },
        ],
      },
      {
        heading: '65. Final Provisions',
        blocks: [
          { type: 'p', text: 'These Terms and Conditions constitute the entire agreement between the Provider and the User regarding the use of the ISAD.academy Platform.' },
          { type: 'p', text: 'Any matter not covered in this document shall be interpreted in accordance with applicable Romanian and European law.' },
        ],
      },
    ],
  },
  ro: {
    title: 'TERMENI ȘI CONDIȚII GENERALE DE UTILIZARE A PLATFORMEI ISAD.academy',
    intro: '',
    sections: [
      {
        heading: '1. Informații generale despre platformă și Prestatorul de servicii',
        blocks: [
          { type: 'p', text: 'Prezentul document stabilește termenii și condițiile generale aplicabile accesării și utilizării site-ului https://isad.academy, precum și achiziționării și utilizării serviciilor educaționale, profesionale și digitale oferite prin intermediul acestuia.' },
          { type: 'p', text: 'Site-ul https://isad.academy, denumit în continuare „Site-ul” sau „Platforma ISAD.academy”, este operat de:' },
          { type: 'p', text: 'INTERNATIONAL SECURITY AND DEFENCE S.R.L., societate cu răspundere limitată organizată și funcționând potrivit legislației din România, cu sediul social în Teişori, Str. Stejarului 6, Cod poștal 87033, înregistrată la Oficiul Registrului Comerțului sub nr. J52/935/2021, având cod unic de înregistrare 44849076, denumită în continuare „ISAD”, „ISAD.academy”, „Prestatorul” sau „Prestatorul de servicii”.' },
          { type: 'p', text: 'Date de contact:' },
          { type: 'ul', items: ['website: https://isad.academy;', 'e-mail: contact@isad.academy;', 'telefon: 40727 392 392;', 'adresă pentru corespondență: One Cotroceni Park, Str Sergent Nutu Ion, nr 44, bl ct3, ap 322.', 'Prin accesarea Site-ului, crearea unui cont, înscrierea la un curs sau eveniment, achiziționarea unui abonament ori a oricărui alt serviciu oferit prin Platformă, Utilizatorul confirmă că a citit, a înțeles și acceptă prezentele Termeni și condiții.'] },
          { type: 'p', text: 'Persoanele care nu sunt de acord cu prevederile prezentului document trebuie să înceteze utilizarea Site-ului și să nu achiziționeze sau utilizeze Serviciile ISAD.academy.' },
        ],
      },
      {
        heading: '2. Despre ISAD.academy',
        blocks: [
          { type: 'p', text: 'ISAD.academy este o platformă educațională și de dezvoltare profesională operată de INTERNATIONAL SECURITY AND DEFENCE S.R.L.' },
          { type: 'p', text: 'Platforma poate oferi programe și activități în domenii precum:' },
          { type: 'ul', items: ['inteligență artificială;', 'analiza datelor și data science;', 'securitate cibernetică;', 'prevenirea și investigarea fraudelor;', 'securitate și apărare;', 'compliance, risk management și guvernanță;', 'investigații și criminalitate financiară;', 'management și leadership;', 'transformare digitală;', 'competențe tehnice și profesionale;', 'alte domenii educaționale sau profesionale conexe.'] },
          { type: 'p', text: 'Serviciile ISAD.academy pot include, fără a se limita la:' },
          { type: 'ul', items: ['cursuri online desfășurate în direct;', 'cursuri online înregistrate;', 'cursuri cu participare fizică;', 'cursuri în format hibrid;', 'webinare;', 'workshopuri;', 'seminare;', 'conferințe;', 'masterclass-uri;', 'bootcampuri;', 'programe de mentorat;', 'sesiuni de coaching;', 'sesiuni de consultanță;', 'evaluări și teste;', 'proiecte practice;', 'comunități profesionale;', 'acces la resurse digitale;', 'programe de dezvoltare profesională;', 'abonamente lunare sau anuale;', 'acces la înregistrări ale unor evenimente;', 'certificări de participare sau absolvire;', 'alte produse sau servicii descrise pe Site.'] },
          { type: 'p', text: 'Descrierea, structura, durata, lectorii, prețul, perioada de acces și condițiile specifice fiecărui Serviciu sunt prezentate în pagina Serviciului respectiv, în oferta comercială, în formularul de înscriere sau în comunicările transmise Utilizatorului.' },
        ],
      },
      {
        heading: '3. Termeni și definiții',
        blocks: [
          { type: 'p', text: 'În sensul prezentelor Termeni și condiții:' },
          { type: 'p', text: '3.1. Prestatorul' },
          { type: 'p', text: '„Prestatorul”, „Prestatorul de servicii”, „ISAD” sau „ISAD.academy” înseamnă INTERNATIONAL SECURITY AND DEFENCE S.R.L.' },
          { type: 'p', text: '3.2. Utilizatorul' },
          { type: 'p', text: '„Utilizatorul” înseamnă orice persoană fizică sau juridică ce accesează Site-ul, creează un cont, solicită informații, se înscrie, achiziționează sau utilizează unul dintre Serviciile oferite de Prestator.' },
          { type: 'p', text: '3.3. Consumatorul' },
          { type: 'p', text: '„Consumatorul” înseamnă persoana fizică ce acționează în scopuri din afara activității sale comerciale, industriale, de producție, artizanale sau profesionale, în sensul legislației aplicabile privind protecția consumatorilor.' },
          { type: 'p', text: '3.4. Clientul' },
          { type: 'p', text: '„Clientul” înseamnă persoana fizică sau juridică ce contractează și achită un Serviciu, indiferent dacă Serviciul este utilizat de Client sau de o altă persoană desemnată de acesta.' },
          { type: 'p', text: '3.5. Participantul' },
          { type: 'p', text: '„Participantul” înseamnă persoana care participă efectiv la un curs, webinar, conferință, program de mentorat sau la un alt Eveniment.' },
          { type: 'p', text: 'Clientul și Participantul pot fi aceeași persoană sau persoane diferite.' },
          { type: 'p', text: '3.6. Plătitorul' },
          { type: 'p', text: '„Plătitorul” înseamnă Utilizatorul, Clientul sau o terță persoană fizică ori juridică ce achită prețul unui Serviciu în beneficiul Participantului.' },
          { type: 'p', text: '3.7. Serviciul' },
          { type: 'p', text: '„Serviciul” înseamnă orice curs, program, abonament, eveniment, sesiune, acces digital, resursă sau alt serviciu oferit de Prestator, gratuit sau contra cost.' },
          { type: 'p', text: '3.8. Evenimentul' },
          { type: 'p', text: '„Evenimentul” înseamnă orice curs, training, webinar, seminar, workshop, conferință, masterclass, bootcamp, prelegere, sesiune de mentorat, sesiune de consultanță sau altă activitate similară organizată ori furnizată de Prestator.' },
          { type: 'p', text: '3.9. Conținutul digital' },
          { type: 'p', text: '„Conținutul digital” înseamnă orice material pus la dispoziție în format digital, inclusiv cursuri video, înregistrări audio, prezentări, fișiere PDF, documente, ghiduri, studii de caz, baze de date, teste, exerciții, cod sursă, notebook-uri, șabloane, infografice, imagini, grafice, software, aplicații sau alte resurse educaționale.' },
          { type: 'p', text: '3.10. LMS' },
          { type: 'p', text: '„Learning Management System” sau „LMS” înseamnă Platforma ISAD.academy sau orice alt sistem digital utilizat de Prestator pentru livrarea cursurilor, administrarea conturilor, transmiterea materialelor, realizarea evaluărilor, emiterea certificatelor și comunicarea cu Utilizatorii.' },
          { type: 'p', text: 'Prestatorul poate utiliza, după caz, și platforme furnizate de terți, precum platforme de videoconferință, sisteme de e-learning, servicii cloud, aplicații de colaborare sau alte instrumente digitale.' },
          { type: 'p', text: '3.11. Contul personal' },
          { type: 'p', text: '„Contul personal” înseamnă secțiunea individuală a Platformei sau a LMS-ului la care Utilizatorul primește acces pe baza datelor sale de autentificare.' },
          { type: 'p', text: '3.12. Lectorul' },
          { type: 'p', text: '„Lectorul” înseamnă formatorul, trainerul, speakerul, mentorul, consultantul, expertul sau colaboratorul care susține integral sau parțial un Serviciu.' },
          { type: 'p', text: '3.13. Comunitatea' },
          { type: 'p', text: '„Comunitatea” înseamnă orice grup, forum, canal de comunicare sau spațiu digital pus la dispoziția Utilizatorilor, inclusiv grupuri organizate prin WhatsApp, Telegram, Facebook, LinkedIn, Discord, Slack sau alte platforme similare.' },
          { type: 'p', text: '3.14. Termenii și condițiile' },
          { type: 'p', text: '„Termenii și condițiile” sau „Termenii” înseamnă prezentul document, împreună cu politicile și condițiile speciale la care acesta face referire.' },
        ],
      },
      {
        heading: '4. Aplicabilitatea Termenilor și încheierea contractului',
        blocks: [
          { type: 'p', text: 'Prezentele Termeni se aplică tuturor Utilizatorilor Site-ului și tuturor contractelor privind Serviciile oferite de ISAD.academy.' },
          { type: 'p', text: 'Contractul dintre Prestator și Client se consideră încheiat în momentul în care are loc cel puțin una dintre următoarele situații:' },
          { type: 'ul', items: ['Clientul finalizează o comandă prin Site;', 'Clientul achită integral sau parțial prețul Serviciului;', 'Prestatorul confirmă în scris înscrierea;', 'Clientul acceptă o ofertă comercială emisă de Prestator;', 'Clientul semnează un contract separat;', 'Clientul solicită începerea furnizării Serviciului;', 'Clientul accesează un Serviciu gratuit condiționat de acceptarea Termenilor.'] },
          { type: 'p', text: 'În cazul în care pentru un anumit Serviciu există condiții contractuale speciale, acestea completează prezentele Termeni.' },
          { type: 'p', text: 'În situația unui conflict între prezentele Termeni și un contract individual semnat între părți, prevalează contractul individual, în măsura permisă de lege.' },
        ],
      },
      {
        heading: '5. Condiții de eligibilitate și vârstă',
        blocks: [
          { type: 'p', text: 'Utilizatorii trebuie să aibă capacitatea legală necesară pentru a încheia contracte.' },
          { type: 'p', text: 'Persoanele care nu au împlinit vârsta de 16 ani nu pot crea singure un Cont personal și nu pot achiziționa Servicii fără acordul și implicarea reprezentantului legal.' },
          { type: 'p', text: 'În situația în care un minor participă la un Serviciu, înscrierea și plata trebuie realizate de către reprezentantul legal sau cu acordul expres al acestuia.' },
          { type: 'p', text: 'Prestatorul poate refuza sau anula accesul unui minor dacă apreciază în mod rezonabil că Serviciul nu este adecvat vârstei acestuia sau dacă nu a fost obținut acordul reprezentantului legal.' },
        ],
      },
      {
        heading: '6. Crearea și utilizarea Contului personal',
        blocks: [
          { type: 'p', text: 'Pentru accesarea anumitor Servicii, Utilizatorul poate fi obligat să creeze un Cont personal.' },
          { type: 'p', text: 'Utilizatorul trebuie să furnizeze informații reale, complete, exacte și actualizate, inclusiv:' },
          { type: 'ul', items: ['numele și prenumele;', 'adresa de e-mail;', 'numărul de telefon;', 'datele de facturare;', 'denumirea și datele persoanei juridice, dacă este cazul;', 'orice alte informații necesare furnizării Serviciului.'] },
          { type: 'p', text: 'Utilizatorul este responsabil pentru:' },
          { type: 'ul', items: ['păstrarea confidențialității datelor de autentificare;', 'toate activitățile realizate prin Contul său;', 'utilizarea unei parole sigure;', 'necomunicarea datelor de acces către alte persoane;', 'notificarea imediată a Prestatorului în cazul unei utilizări neautorizate.'] },
          { type: 'p', text: 'Contul și dreptul de acces sunt personale și nu pot fi transferate, revândute, împrumutate sau partajate cu terțe persoane.' },
          { type: 'p', text: 'Prestatorul poate suspenda temporar sau poate dezactiva Contul dacă există indicii rezonabile privind:' },
          { type: 'ul', items: ['partajarea accesului cu alte persoane;', 'utilizarea neautorizată;', 'încălcarea drepturilor de proprietate intelectuală;', 'tentative de fraudă;', 'încălcarea prezentelor Termeni;', 'neplata sumelor datorate;', 'afectarea securității Platformei;', 'conduită abuzivă față de lectori, angajați sau alți Participanți.'] },
          { type: 'p', text: 'În măsura posibilului, Utilizatorul va fi informat cu privire la motivul suspendării sau dezactivării.' },
        ],
      },
      {
        heading: '7. Înscrierea la cursuri și Evenimente',
        blocks: [
          { type: 'p', text: 'Înscrierea se poate realiza prin:' },
          { type: 'ul', items: ['completarea formularului disponibil pe Site;', 'crearea unui Cont personal;', 'achiziționarea directă a unui Serviciu;', 'acceptarea unei oferte comerciale;', 'transmiterea unei solicitări prin e-mail;', 'înscrierea prin intermediul unui partener;', 'o altă procedură indicată de Prestator.'] },
          { type: 'p', text: 'Înscrierea este considerată confirmată numai după îndeplinirea condițiilor comunicate pentru Serviciul respectiv, care pot include:' },
          { type: 'ul', items: ['confirmarea transmisă de Prestator;', 'achitarea integrală sau parțială a prețului;', 'acceptarea Termenilor;', 'furnizarea datelor necesare;', 'îndeplinirea eventualelor condiții de admitere.'] },
          { type: 'p', text: 'Numărul locurilor poate fi limitat.' },
          { type: 'p', text: 'Prestatorul poate refuza o înscriere, în mod justificat, în cazul în care:' },
          { type: 'ul', items: ['numărul maxim de participanți a fost atins;', 'plata nu a fost efectuată;', 'Utilizatorul a încălcat anterior obligațiile contractuale;', 'participarea ar putea afecta buna desfășurare a Evenimentului;', 'nu sunt îndeplinite condițiile minime de participare;', 'există motive de securitate, conformitate sau integritate.'] },
        ],
      },
      {
        heading: '8. Descrierea și organizarea Serviciilor',
        blocks: [
          { type: 'p', text: 'Prestatorul va depune eforturi rezonabile pentru ca informațiile publicate despre Servicii să fie corecte și actualizate.' },
          { type: 'p', text: 'Pentru fiecare Serviciu pot fi comunicate:' },
          { type: 'ul', items: ['obiectivele;', 'programa;', 'nivelul de dificultate;', 'cerințele preliminare;', 'data și programul;', 'durata;', 'formatul;', 'lectorii;', 'prețul;', 'perioada de acces;', 'modalitatea de evaluare;', 'condițiile de certificare;', 'resursele incluse;', 'condițiile tehnice.'] },
          { type: 'p', text: 'Imaginile, materialele promoționale, descrierile și prezentările au caracter informativ. Prestatorul poate adapta în mod rezonabil structura sau ordinea modulelor, exercițiile, exemplele și metodele de predare, fără a modifica în mod esențial obiectul Serviciului.' },
          { type: 'p', text: 'Prestatorul nu garantează că participarea la un Serviciu va determina:' },
          { type: 'ul', items: ['obținerea unui loc de muncă;', 'promovarea profesională;', 'creșterea veniturilor;', 'obținerea unei certificări externe;', 'admiterea într-o organizație;', 'obținerea unei finanțări;', 'dobândirea unui anumit nivel de performanță;', 'obținerea unui rezultat economic sau profesional specific.'] },
          { type: 'p', text: 'Rezultatele depind inclusiv de pregătirea, implicarea, experiența și activitatea individuală a Participantului.' },
        ],
      },
      {
        heading: '9. Modalitatea de furnizare',
        blocks: [
          { type: 'p', text: 'Serviciile pot fi furnizate:' },
          { type: 'ul', items: ['fizic;', 'online, în direct;', 'online, prin materiale înregistrate;', 'în format hibrid;', 'printr-un LMS;', 'prin platforme de videoconferință;', 'prin e-mail;', 'prin Comunități;', 'prin alte mijloace comunicate Utilizatorului.'] },
          { type: 'p', text: 'Utilizatorul este responsabil pentru asigurarea echipamentelor și condițiilor tehnice necesare, precum:' },
          { type: 'ul', items: ['calculator, tabletă sau telefon compatibil;', 'conexiune stabilă la internet;', 'adresă de e-mail funcțională;', 'browser actualizat;', 'software și aplicații necesare;', 'cameră și microfon, dacă sunt solicitate;', 'respectarea cerințelor tehnice prezentate pentru curs.'] },
          { type: 'p', text: 'Prestatorul nu răspunde pentru imposibilitatea accesării Serviciului cauzată exclusiv de echipamentele, conexiunea, software-ul sau configurațiile Utilizatorului.' },
        ],
      },
      {
        heading: '10. Platforme și furnizori terți',
        blocks: [
          { type: 'p', text: 'Pentru furnizarea Serviciilor, Prestatorul poate utiliza servicii sau platforme operate de terți.' },
          { type: 'p', text: 'Utilizatorului i se pot aplica și termenii furnizorilor respectivi.' },
          { type: 'p', text: 'Prestatorul nu controlează integral disponibilitatea, funcționarea sau politicile platformelor terțe și nu răspunde pentru întreruperile ori defecțiunile cauzate exclusiv de acestea.' },
          { type: 'p', text: 'În cazul unei defecțiuni semnificative, Prestatorul va depune eforturi rezonabile pentru:' },
          { type: 'ul', items: ['reluarea activității;', 'schimbarea platformei;', 'reprogramarea sesiunii;', 'transmiterea unei înregistrări;', 'oferirea unei soluții alternative adecvate.'] },
        ],
      },
      {
        heading: '11. Perioada de acces',
        blocks: [
          { type: 'p', text: 'Perioada de acces la fiecare curs, material, înregistrare, Comunitate sau alt Serviciu este cea indicată în pagina de prezentare, oferta comercială, confirmarea de înscriere sau contractul individual.' },
          { type: 'p', text: 'Perioada de acces poate fi, după caz:' },
          { type: 'ul', items: ['limitată la durata Evenimentului;', 'de 30, 60 sau 90 de zile;', 'de 6 sau 12 luni;', 'valabilă pe durata unui abonament activ;', 'stabilită printr-un contract individual;', 'acordată pentru o altă perioadă comunicată înainte de achiziție.'] },
          { type: 'p', text: 'Dacă nu este indicată o perioadă distinctă, accesul la materialele digitale aferente unui curs este acordat pentru o perioadă de 12 luni de la data activării, cu excepția materialelor puse la dispoziție exclusiv pentru descărcare.' },
          { type: 'p', text: 'Prestatorul nu este obligat să mențină pe perioadă nedeterminată Site-ul, Contul, materialele, înregistrările sau accesul la un Serviciu.' },
          { type: 'p', text: 'Utilizatorul este responsabil să consulte și, atunci când descărcarea este permisă, să salveze materialele în perioada de acces.' },
        ],
      },
      {
        heading: '12. Abonamente',
        blocks: [
          { type: 'p', text: 'Anumite Servicii pot fi oferite pe bază de abonament lunar, trimestrial sau anual.' },
          { type: 'p', text: 'Condițiile abonamentului, inclusiv:' },
          { type: 'ul', items: ['prețul;', 'perioada;', 'beneficiile;', 'data facturării;', 'caracterul recurent sau nerecurent;', 'condițiile de anulare;', 'eventualele perioade promoționale,'] },
          { type: 'p', text: 'vor fi prezentate înainte de achiziție.' },
          { type: 'p', text: 'În cazul abonamentelor recurente, Utilizatorul va fi informat în mod clar înainte de plată cu privire la caracterul recurent al acesteia.' },
          { type: 'p', text: 'În cazul anulării abonamentului, Utilizatorul va putea utiliza Serviciul până la finalul perioadei deja achitate, cu excepția cazului în care:' },
          { type: 'ul', items: ['se prevede altfel în oferta abonamentului;', 'accesul este retras ca urmare a unei încălcări contractuale;', 'legea impune o altă soluție.'] },
          { type: 'p', text: 'Sumele achitate pentru perioade de abonament deja începute nu se rambursează proporțional, cu excepția cazurilor prevăzute de lege sau acceptate expres de Prestator.' },
          { type: 'p', text: 'Prestatorul poate modifica prețul unui abonament pentru perioadele viitoare, cu informarea prealabilă a Utilizatorului. Modificarea nu afectează perioada deja achitată.' },
        ],
      },
      {
        heading: '13. Prețuri, facturare și plată',
        blocks: [
          { type: 'p', text: 'Prețul fiecărui Serviciu este cel afișat pe Site sau comunicat în oferta comercială.' },
          { type: 'p', text: 'Prețurile pot fi exprimate în RON, EUR sau într-o altă monedă indicată.' },
          { type: 'p', text: 'Prestatorul va informa Clientul dacă prețul:' },
          { type: 'ul', items: ['include TVA;', 'nu include TVA;', 'beneficiază de o scutire sau de un regim fiscal special;', 'presupune taxe suplimentare.'] },
          { type: 'p', text: 'Plata poate fi efectuată prin:' },
          { type: 'ul', items: ['card bancar;', 'transfer bancar;', 'procesator de plăți;', 'link de plată;', 'plată în rate;', 'orice altă metodă comunicată de Prestator.'] },
          { type: 'p', text: 'Procesarea plăților poate fi realizată prin furnizori terți. Prestatorul nu stochează în mod necesar datele complete ale cardului bancar.' },
          { type: 'p', text: 'Obligația Prestatorului de a furniza Serviciul apare după confirmarea plății sau după îndeplinirea condițiilor stabilite în oferta comercială.' },
          { type: 'p', text: 'Factura se emite pe baza informațiilor furnizate de Client. Clientul este responsabil pentru corectitudinea datelor de facturare.' },
        ],
      },
      {
        heading: '14. Plata în rate și avansurile',
        blocks: [
          { type: 'p', text: 'Atunci când plata în rate este permisă, Clientul trebuie să respecte scadențele comunicate.' },
          { type: 'p', text: 'Dacă o rată nu este achitată la termen, Prestatorul poate:' },
          { type: 'ul', items: ['suspenda accesul la Serviciu;', 'amâna emiterea certificatului;', 'suspenda accesul la materiale;', 'solicita plata integrală a sumelor scadente;', 'înceta contractul, în condițiile legii.'] },
          { type: 'p', text: 'Dacă Clientul achită un avans pentru rezervarea unui loc și ulterior renunță din motive care nu sunt imputabile Prestatorului, avansul poate fi reținut în măsura în care acest lucru a fost comunicat anterior și este permis de lege.' },
          { type: 'p', text: 'Pentru Consumatori, prevederile privind avansurile și retragerea se aplică fără a limita drepturile obligatorii acordate de legislația privind protecția consumatorilor.' },
        ],
      },
      {
        heading: '15. Reduceri, vouchere și campanii promoționale',
        blocks: [
          { type: 'p', text: 'Prestatorul poate oferi reduceri, vouchere, burse, acces promoțional sau alte beneficii.' },
          { type: 'p', text: 'Acestea:' },
          { type: 'ul', items: ['sunt valabile în perioada indicată;', 'nu pot fi transformate în numerar;', 'nu pot fi transferate, dacă nu se specifică altfel;', 'nu se cumulează, dacă acest lucru nu este prevăzut expres;', 'pot fi condiționate de îndeplinirea unor criterii;', 'pot fi retrase în caz de utilizare frauduloasă.'] },
          { type: 'p', text: 'Prestatorul poate corecta erorile evidente privind prețurile, cu informarea Clientului și oferirea posibilității de a confirma comanda la prețul corect sau de a solicita anularea acesteia.' },
        ],
      },
      {
        heading: '16. Dreptul legal de retragere al Consumatorului',
        blocks: [
          { type: 'p', text: 'În cazul contractelor la distanță, Consumatorul beneficiază, în principiu, de dreptul de a se retrage din contract în termen de 14 zile, fără a fi obligat să își justifice decizia, în condițiile și cu excepțiile prevăzute de legislația aplicabilă.' },
          { type: 'p', text: 'Termenul de retragere curge, după caz, de la data încheierii contractului.' },
          { type: 'p', text: 'Pentru exercitarea dreptului de retragere, Consumatorul trebuie să transmită o declarație neechivocă la adresa:' },
          { type: 'p', text: 'support@isad.academy' },
          { type: 'p', text: 'sau printr-un alt mijloc pus la dispoziție pe Site.' },
          { type: 'p', text: 'Notificarea trebuie să permită identificarea Clientului și a Serviciului achiziționat.' },
          { type: 'p', text: 'Consumatorul poate utiliza următorul model:' },
          { type: 'p', text: '„Vă informez prin prezenta cu privire la retragerea mea din contractul referitor la următorul Serviciu: [DENUMIREA SERVICIULUI], comandat la data de [DATA]. Numele consumatorului: [NUME]. Adresa: [ADRESĂ]. Data: [DATA].”' },
          { type: 'p', text: 'Utilizarea modelului nu este obligatorie.' },
        ],
      },
      {
        heading: '17. Începerea Serviciului înainte de expirarea termenului de retragere',
        blocks: [
          { type: 'p', text: 'Dacă un Consumator solicită începerea furnizării unui Serviciu în perioada de 14 zile, Prestatorul poate solicita exprimarea unei cereri exprese în acest sens.' },
          { type: 'p', text: 'În cazul în care Consumatorul își exercită ulterior dreptul de retragere, acesta poate datora o sumă proporțională cu partea din Serviciu furnizată până la momentul retragerii, în condițiile legii.' },
          { type: 'p', text: 'Dacă Serviciul a fost executat integral în perioada de retragere, iar executarea a început cu acordul prealabil expres al Consumatorului și după confirmarea faptului că acesta înțelege că își va pierde dreptul de retragere după executarea integrală, dreptul de retragere poate înceta în condițiile legii.' },
        ],
      },
      {
        heading: '18. Conținutul digital și pierderea dreptului de retragere',
        blocks: [
          { type: 'p', text: 'Pentru Conținutul digital care nu este livrat pe un suport material, furnizarea poate începe imediat după achiziție numai în condițiile prevăzute de lege.' },
          { type: 'p', text: 'Înainte de activarea imediată a accesului, Consumatorului i se poate solicita:' },
          { type: 'ul', items: ['consimțământul prealabil expres pentru începerea furnizării înainte de expirarea termenului de 14 zile;', 'confirmarea faptului că înțelege că, prin începerea furnizării, își poate pierde dreptul de retragere;', 'confirmarea contractului pe un suport durabil.'] },
          { type: 'p', text: 'Dacă aceste condiții sunt îndeplinite, Consumatorul nu mai poate exercita dreptul de retragere pentru Conținutul digital a cărui furnizare a început.' },
          { type: 'p', text: 'Simpla accesare a unui curs live sau a unei părți dintr-un Serviciu nu elimină automat drepturile Consumatorului în afara situațiilor și condițiilor prevăzute de lege.' },
        ],
      },
      {
        heading: '19. Politica comercială de anulare și rambursare',
        blocks: [
          { type: 'p', text: 'În completarea drepturilor legale, pentru anumite Servicii Prestatorul poate oferi o politică comercială de anulare sau rambursare.' },
          { type: 'p', text: 'Condițiile concrete vor fi indicate în pagina Serviciului sau în oferta comercială.' },
          { type: 'p', text: 'Dacă nu sunt indicate condiții distincte, se aplică următoarele reguli:' },
          { type: 'p', text: '19.1. Cursuri și Evenimente programate' },
          { type: 'p', text: 'Clientul poate solicita anularea participării prin notificare scrisă.' },
          { type: 'p', text: 'În funcție de momentul notificării, Prestatorul poate oferi:' },
          { type: 'ul', items: ['rambursarea integrală;', 'rambursarea parțială;', 'transferul la o ediție viitoare;', 'un voucher;', 'înlocuirea Participantului;', 'acces la înregistrare, dacă aceasta există.'] },
          { type: 'p', text: 'Soluția va ține cont de costurile deja angajate, natura Serviciului și prevederile legale aplicabile.' },
          { type: 'p', text: '19.2. Neprezentarea Participantului' },
          { type: 'p', text: 'Neprezentarea la un Eveniment confirmat nu determină automat dreptul la rambursare.' },
          { type: 'p', text: 'Dacă este posibil, Prestatorul poate oferi acces la înregistrare, transfer la o ediție viitoare sau un alt beneficiu, fără ca acest lucru să constituie o obligație generală.' },
          { type: 'p', text: '19.3. Servicii personalizate' },
          { type: 'p', text: 'Sumele achitate pentru servicii personalizate, consultanță, mentorat, coaching sau programe realizate potrivit cerințelor Clientului pot fi nerambursabile după începerea pregătirii sau executării acestora, în măsura permisă de lege.' },
          { type: 'p', text: '19.4. Conținut digital accesat' },
          { type: 'p', text: 'După activarea și accesarea Conținutului digital, rambursarea poate fi refuzată dacă sunt îndeplinite condițiile legale privind pierderea dreptului de retragere.' },
          { type: 'p', text: 'Prezenta politică comercială nu limitează drepturile legale obligatorii ale Consumatorului.' },
        ],
      },
      {
        heading: '20. Anularea sau reprogramarea de către Prestator',
        blocks: [
          { type: 'p', text: 'Prestatorul poate modifica, reprograma sau anula un Serviciu din motive precum:' },
          { type: 'ul', items: ['indisponibilitatea Lectorului;', 'număr insuficient de participanți;', 'probleme tehnice;', 'motive de sănătate;', 'situații de forță majoră;', 'cerințe legale sau administrative;', 'evenimente externe care fac imposibilă sau nerezonabilă organizarea;', 'alte motive obiective.'] },
          { type: 'p', text: 'În cazul reprogramării, Prestatorul va informa Participanții și va comunica noua dată într-un termen rezonabil.' },
          { type: 'p', text: 'Dacă modificarea este semnificativă și noua dată nu este adecvată pentru Participant, Prestatorul poate oferi, după caz:' },
          { type: 'ul', items: ['transferul la o ediție viitoare;', 'un voucher;', 'un Serviciu echivalent;', 'acces la înregistrare;', 'rambursarea sumelor achitate pentru partea neexecutată.'] },
          { type: 'p', text: 'În cazul anulării definitive de către Prestator, Clientul are dreptul la restituirea sumelor achitate pentru Serviciul anulat, dacă nu acceptă o alternativă.' },
          { type: 'p', text: 'Rambursarea se va efectua, de regulă, prin aceeași metodă de plată sau în contul indicat de Client, într-un termen rezonabil și în limitele termenelor prevăzute de lege.' },
          { type: 'p', text: 'Răspunderea Prestatorului pentru anularea unui Serviciu nu va depăși, în principiu, suma plătită pentru Serviciul respectiv, fără a afecta drepturile care nu pot fi limitate legal.' },
        ],
      },
      {
        heading: '21. Înlocuirea Lectorilor și modificarea programului',
        blocks: [
          { type: 'p', text: 'Prestatorul poate înlocui un Lector cu un alt specialist având experiență relevantă, atunci când înlocuirea este necesară din motive obiective.' },
          { type: 'p', text: 'Prestatorul poate ajusta:' },
          { type: 'ul', items: ['ordinea modulelor;', 'intervalele orare;', 'exemplele;', 'exercițiile;', 'metodele de predare;', 'resursele;', 'formatul unor sesiuni,'] },
          { type: 'p', text: 'cu condiția ca obiectivul și valoarea generală a Serviciului să nu fie diminuate în mod semnificativ.' },
        ],
      },
      {
        heading: '22. Certificate',
        blocks: [
          { type: 'p', text: 'În funcție de Serviciu și de condițiile comunicate, Participantul poate primi:' },
          { type: 'ul', items: ['certificat de participare;', 'certificat de absolvire;', 'certificat de finalizare;', 'diplomă simbolică;', 'badge digital;', 'alt document emis de Prestator sau de un partener.'] },
          { type: 'p', text: 'Emiterea certificatului poate fi condiționată de:' },
          { type: 'ul', items: ['participarea la un anumit procent din sesiuni;', 'finalizarea unor teste;', 'predarea unui proiect;', 'obținerea unui punctaj minim;', 'achitarea integrală a prețului;', 'respectarea regulilor programului.'] },
          { type: 'p', text: 'Certificatele emise de ISAD.academy reprezintă dovada participării sau absolvirii unui program organizat de Prestator.' },
          { type: 'p', text: 'Acestea nu constituie diplome recunoscute de stat și nu conferă automat o calificare profesională reglementată, cu excepția cazului în care acreditarea sau recunoașterea este menționată expres în descrierea programului.' },
          { type: 'p', text: 'Atunci când un program este realizat împreună cu un organism de certificare, o instituție acreditată sau un partener extern, condițiile și recunoașterea certificatului vor fi prezentate separat.' },
        ],
      },
      {
        heading: '23. Evaluări, teme și integritate academică',
        blocks: [
          { type: 'p', text: 'Utilizatorii trebuie să realizeze în mod onest testele, proiectele și temele.' },
          { type: 'p', text: 'Sunt interzise:' },
          { type: 'ul', items: ['plagiatul;', 'copierea lucrărilor altor persoane;', 'prezentarea unor materiale generate integral de alte persoane ca fiind proprii;', 'falsificarea rezultatelor;', 'oferirea răspunsurilor altor participanți;', 'utilizarea neautorizată a materialelor confidențiale;', 'manipularea sistemelor de evaluare.'] },
          { type: 'p', text: 'Utilizarea instrumentelor bazate pe inteligență artificială este permisă numai în măsura indicată de Lector sau de regulile programului.' },
          { type: 'p', text: 'Prestatorul poate solicita Participantului să declare utilizarea sistemelor de inteligență artificială și să explice contribuția proprie.' },
          { type: 'p', text: 'În cazul încălcării regulilor de integritate, Prestatorul poate:' },
          { type: 'ul', items: ['solicita refacerea lucrării;', 'anula rezultatul;', 'refuza certificarea;', 'suspenda accesul;', 'exclude Participantul din program.'] },
        ],
      },
      {
        heading: '24. Utilizarea sistemelor de inteligență artificială',
        blocks: [
          { type: 'p', text: 'Prestatorul poate utiliza sisteme bazate pe inteligență artificială pentru:' },
          { type: 'ul', items: ['recomandarea resurselor;', 'organizarea materialelor;', 'furnizarea de asistență educațională;', 'generarea unor exerciții;', 'analiza feedbackului;', 'automatizarea comunicărilor;', 'facilitarea procesului de învățare;', 'îmbunătățirea Serviciilor.'] },
          { type: 'p', text: 'Răspunsurile generate de sisteme de inteligență artificială pot conține erori, omisiuni sau informații inexacte și trebuie verificate de Utilizator.' },
          { type: 'p', text: 'Materialele generate sau asistate de AI nu reprezintă consultanță juridică, fiscală, medicală, financiară, de securitate sau profesională individualizată.' },
          { type: 'p', text: 'Utilizatorul nu trebuie să introducă în instrumentele AI puse la dispoziție prin curs:' },
          { type: 'ul', items: ['date personale sensibile;', 'informații clasificate;', 'secrete comerciale;', 'date confidențiale ale angajatorului;', 'credențiale;', 'parole;', 'informații ale unor terțe persoane fără drept.'] },
          { type: 'p', text: 'Prestatorul poate adopta reguli suplimentare privind utilizarea responsabilă a inteligenței artificiale.' },
        ],
      },
      {
        heading: '25. Comunități și grupuri de comunicare',
        blocks: [
          { type: 'p', text: 'Participanții pot primi acces la Comunități administrate de Prestator.' },
          { type: 'p', text: 'În cadrul Comunităților, Utilizatorul trebuie să respecte:' },
          { type: 'ul', items: ['un limbaj civilizat;', 'drepturile celorlalți;', 'confidențialitatea;', 'drepturile de autor;', 'instrucțiunile moderatorilor;', 'scopul educațional sau profesional al grupului.'] },
          { type: 'p', text: 'Sunt interzise:' },
          { type: 'ul', items: ['hărțuirea;', 'amenințările;', 'discursul discriminatoriu;', 'publicitatea nesolicitată;', 'mesajele repetitive;', 'distribuirea materialelor cursului;', 'colectarea datelor membrilor fără acord;', 'transmiterea de malware;', 'promovarea unor activități ilegale;', 'contactarea agresivă a membrilor;', 'folosirea Comunității pentru recrutare sau vânzare fără permisiune.'] },
          { type: 'p', text: 'Prestatorul poate modera, ascunde sau șterge conținutul care încalcă regulile și poate elimina Utilizatorul din Comunitate.' },
          { type: 'p', text: 'Eliminarea din Comunitate nu conduce automat la rambursarea prețului Serviciului dacă măsura a fost determinată de conduita Utilizatorului.' },
        ],
      },
      {
        heading: '26. Conținutul încărcat de Utilizator',
        blocks: [
          { type: 'p', text: 'Utilizatorul poate încărca sau transmite:' },
          { type: 'ul', items: ['teme;', 'proiecte;', 'întrebări;', 'comentarii;', 'imagini;', 'materiale audio-video;', 'feedback;', 'alte materiale.'] },
          { type: 'p', text: 'Utilizatorul păstrează drepturile asupra conținutului propriu.' },
          { type: 'p', text: 'Prin încărcarea conținutului în Platformă, Utilizatorul acordă Prestatorului o licență neexclusivă, gratuită și limitată la perioada și scopurile necesare pentru:' },
          { type: 'ul', items: ['furnizarea Serviciului;', 'evaluarea lucrării;', 'afișarea în cadrul grupului educațional relevant;', 'stocarea și administrarea tehnică;', 'prevenirea fraudei și plagiatului;', 'soluționarea unor reclamații;', 'respectarea obligațiilor legale.'] },
          { type: 'p', text: 'Conținutul Utilizatorului nu va fi utilizat în scop promoțional în afara cadrului educațional fără un temei juridic corespunzător și, atunci când este necesar, fără acordul Utilizatorului.' },
          { type: 'p', text: 'Utilizatorul declară că:' },
          { type: 'ul', items: ['deține drepturile necesare asupra materialului;', 'materialul nu încalcă drepturile altor persoane;', 'materialul nu conține informații ilegale;', 'publicarea sau transmiterea sa nu încalcă obligații de confidențialitate.'] },
        ],
      },
      {
        heading: '27. Reguli generale de utilizare a Site-ului',
        blocks: [
          { type: 'p', text: 'Utilizatorul se obligă să nu utilizeze Site-ul sau Serviciile:' },
          { type: 'ul', items: ['în scopuri ilegale;', 'pentru a încălca drepturile altor persoane;', 'pentru a distribui conținut ofensator, violent, discriminatoriu sau obscen;', 'pentru hărțuire, amenințare sau defăimare;', 'pentru transmiterea de spam;', 'pentru introducerea de viruși, malware sau cod dăunător;', 'pentru accesarea neautorizată a conturilor sau sistemelor;', 'pentru testarea vulnerabilităților fără autorizare;', 'pentru colectarea datelor altor Utilizatori;', 'pentru copierea sau extragerea automată a Conținutului;', 'pentru revânzarea accesului;', 'pentru evitarea măsurilor tehnice de securitate;', 'pentru afectarea funcționării Platformei.'] },
          { type: 'p', text: 'Utilizatorul nu poate utiliza roboți, crawleri, aplicații de scraping sau alte mijloace automate pentru copierea ori extragerea Conținutului fără acordul scris al Prestatorului.' },
        ],
      },
      {
        heading: '28. Drepturi de proprietate intelectuală',
        blocks: [
          { type: 'p', text: 'Site-ul și Conținutul pus la dispoziție prin ISAD.academy sunt protejate de legislația privind drepturile de autor, mărcile, bazele de date, secretele comerciale și alte drepturi de proprietate intelectuală.' },
          { type: 'p', text: 'Drepturile pot aparține:' },
          { type: 'ul', items: ['Prestatorului;', 'Lectorilor;', 'partenerilor;', 'furnizorilor de tehnologie;', 'altor titulari indicați.'] },
          { type: 'p', text: '„Conținutul” include, fără limitare:' },
          { type: 'ul', items: ['texte;', 'prezentări;', 'suporturi de curs;', 'înregistrări;', 'materiale video și audio;', 'imagini;', 'infografice;', 'grafice;', 'exerciții;', 'teste;', 'baze de date;', 'metodologii;', 'studii de caz;', 'cod;', 'aplicații;', 'modele;', 'structuri de curs;', 'logo-uri;', 'mărci;', 'designul Site-ului.'] },
          { type: 'p', text: 'Achiziționarea unui Serviciu nu transferă Utilizatorului dreptul de proprietate asupra Conținutului.' },
          { type: 'p', text: 'Utilizatorul primește numai un drept limitat, personal, neexclusiv, netransferabil și revocabil de a accesa Conținutul pentru uz educațional propriu, în perioada comunicată.' },
        ],
      },
      {
        heading: '29. Utilizări interzise ale materialelor',
        blocks: [
          { type: 'p', text: 'Fără acordul scris al titularului drepturilor, Utilizatorului îi este interzis:' },
          { type: 'ul', items: ['să copieze materialele;', 'să înregistreze cursurile;', 'să fotografieze sau să captureze integral conținutul;', 'să reproducă materialele;', 'să le distribuie altor persoane;', 'să le publice online;', 'să le încarce pe platforme de partajare;', 'să le revândă;', 'să le închirieze;', 'să le traducă și distribuie;', 'să le modifice;', 'să elimine mărcile sau mențiunile de autor;', 'să creeze cursuri concurente prin reproducerea substanțială a structurii sau conținutului;', 'să introducă materialele în sisteme de inteligență artificială pentru antrenare, reproducere, indexare sau generarea unor materiale concurente;', 'să utilizeze Conținutul în baze de date comerciale;', 'să partajeze datele de acces.'] },
          { type: 'p', text: 'Descărcarea este permisă numai pentru materialele marcate ca descărcabile și exclusiv pentru uz personal.' },
          { type: 'p', text: 'Utilizatorul poate păstra notițe proprii și poate utiliza cunoștințele dobândite în activitatea sa profesională, fără a reproduce sau distribui materialele originale.' },
        ],
      },
      {
        heading: '30. Înregistrarea Evenimentelor',
        blocks: [
          { type: 'p', text: 'Anumite Evenimente pot fi înregistrate audio sau video.' },
          { type: 'p', text: 'Prestatorul va informa Participanții, în mod rezonabil, cu privire la realizarea înregistrării.' },
          { type: 'p', text: 'Înregistrarea poate include:' },
          { type: 'ul', items: ['vocea Participantului;', 'imaginea Participantului;', 'numele afișat;', 'fotografia de profil;', 'întrebările sau intervențiile;', 'materialele prezentate în cadrul sesiunii.'] },
          { type: 'p', text: 'Înregistrările pot fi puse la dispoziția:' },
          { type: 'ul', items: ['participanților la Eveniment;', 'Utilizatorilor care achiziționează acces la înregistrare;', 'Lectorilor;', 'personalului implicat în organizare;', 'altor categorii indicate înainte sau în timpul Evenimentului.'] },
          { type: 'p', text: 'Înregistrările nu vor fi utilizate în campanii publicitare care îl identifică în mod clar pe Participant fără un temei juridic corespunzător și, atunci când este necesar, fără consimțământ.' },
          { type: 'p', text: 'Participantul care nu dorește să apară în înregistrare trebuie, în măsura în care formatul permite:' },
          { type: 'ul', items: ['să mențină camera oprită;', 'să utilizeze o denumire care nu dezvăluie date suplimentare;', 'să transmită întrebările în scris;', 'să informeze organizatorul înainte de Eveniment.'] },
          { type: 'p', text: 'Prestatorul poate interzice înregistrarea Evenimentului de către Participanți.' },
        ],
      },
      {
        heading: '31. Fotografii și materiale promoționale',
        blocks: [
          { type: 'p', text: 'Pentru Evenimentele fizice, Prestatorul poate realiza fotografii sau imagini generale în scopul documentării activității și promovării evenimentului.' },
          { type: 'p', text: 'Atunci când o persoană este subiectul principal și poate fi identificată în mod clar, Prestatorul va utiliza imaginea acesteia în conformitate cu legislația aplicabilă și, atunci când este necesar, pe baza consimțământului.' },
          { type: 'p', text: 'Participantul poate comunica organizatorului înainte de Eveniment că nu dorește să fie fotografiat sau filmat în scop promoțional.' },
        ],
      },
      {
        heading: '32. Feedback, testimoniale și rezultate',
        blocks: [
          { type: 'p', text: 'Utilizatorul poate transmite în mod voluntar feedback sau testimoniale.' },
          { type: 'p', text: 'Prestatorul poate utiliza feedbackul anonim sau agregat pentru îmbunătățirea Serviciilor.' },
          { type: 'p', text: 'Publicarea unui testimonial împreună cu numele, imaginea, funcția, compania ori alte elemente de identificare se va realiza numai în baza unui temei juridic corespunzător și, când este necesar, cu acordul persoanei.' },
          { type: 'p', text: 'Utilizatorul poate solicita încetarea utilizării unui testimonial, fără a afecta utilizările realizate legal anterior solicitării.' },
        ],
      },
      {
        heading: '33. Protecția datelor personale',
        blocks: [
          { type: 'p', text: 'Prestatorul prelucrează datele personale în conformitate cu legislația aplicabilă privind protecția datelor.' },
          { type: 'p', text: 'Informațiile detaliate privind:' },
          { type: 'ul', items: ['categoriile de date;', 'scopurile prelucrării;', 'temeiurile juridice;', 'destinatarii;', 'durata stocării;', 'transferurile internaționale;', 'drepturile persoanelor vizate;', 'utilizarea cookie-urilor;', 'datele de contact privind protecția datelor,'] },
          { type: 'p', text: 'sunt prezentate în Politica de confidențialitate și Politica privind cookie-urile, disponibile pe Site.' },
          { type: 'p', text: 'Acceptarea prezentelor Termeni nu echivalează automat cu acordul pentru comunicări comerciale.' },
          { type: 'p', text: 'Comunicările de marketing vor fi transmise în condițiile legii, iar Utilizatorul se poate dezabona prin mecanismul indicat în fiecare comunicare sau prin contactarea Prestatorului.' },
          { type: 'p', text: 'Prestatorul poate transmite comunicări necesare executării contractului, precum:' },
          { type: 'ul', items: ['confirmări de comandă;', 'facturi;', 'date de acces;', 'modificări de program;', 'informații despre Serviciul achiziționat;', 'notificări de securitate;', 'informații administrative.'] },
        ],
      },
      {
        heading: '34. Confidențialitatea informațiilor',
        blocks: [
          { type: 'p', text: 'În cadrul anumitor Servicii, Participanții, Lectorii sau Prestatorul pot comunica informații confidențiale.' },
          { type: 'p', text: 'Utilizatorul se obligă să nu divulge fără autorizare:' },
          { type: 'ul', items: ['date personale ale altor Participanți;', 'informații comerciale;', 'studii de caz nepublice;', 'informații despre clienți;', 'secrete comerciale;', 'date tehnice;', 'informații marcate drept confidențiale;', 'discuțiile private din cadrul grupurilor.'] },
          { type: 'p', text: 'Prestatorul poate solicita semnarea unui acord separat de confidențialitate pentru anumite programe.' },
          { type: 'p', text: 'Utilizatorul trebuie să anonimizeze informațiile confidențiale utilizate în exerciții și proiecte.' },
        ],
      },
      {
        heading: '35. Securitatea informațiilor',
        blocks: [
          { type: 'p', text: 'Prestatorul implementează măsuri tehnice și organizatorice rezonabile pentru protejarea Platformei și a datelor.' },
          { type: 'p', text: 'Niciun sistem informatic nu poate fi garantat ca fiind complet lipsit de riscuri.' },
          { type: 'p', text: 'Utilizatorul trebuie:' },
          { type: 'ul', items: ['să folosească parole puternice;', 'să nu partajeze credențialele;', 'să actualizeze dispozitivele și aplicațiile;', 'să utilizeze soluții de securitate adecvate;', 'să raporteze incidentele sau vulnerabilitățile observate;', 'să nu încerce exploatarea unei vulnerabilități.'] },
          { type: 'p', text: 'Raportările de securitate pot fi transmise la contact@isad.academy' },
        ],
      },
      {
        heading: '36. Disponibilitatea Site-ului',
        blocks: [
          { type: 'p', text: 'Prestatorul depune eforturi rezonabile pentru menținerea disponibilității Site-ului și Serviciilor.' },
          { type: 'p', text: 'Accesul poate fi întrerupt temporar pentru:' },
          { type: 'ul', items: ['mentenanță;', 'actualizări;', 'remedierea unor defecțiuni;', 'incidente de securitate;', 'probleme ale furnizorilor;', 'cauze de forță majoră;', 'alte motive obiective.'] },
          { type: 'p', text: 'Prestatorul nu garantează funcționarea neîntreruptă sau lipsită de erori a Site-ului.' },
          { type: 'p', text: 'Atunci când întreruperea afectează semnificativ un Serviciu achiziționat, Prestatorul va depune eforturi rezonabile pentru a oferi o soluție adecvată, cum ar fi prelungirea accesului, reprogramarea sau furnizarea unei metode alternative.' },
        ],
      },
      {
        heading: '37. Conformitatea Serviciilor și sesizarea problemelor',
        blocks: [
          { type: 'p', text: 'Prestatorul va furniza Serviciile în conformitate cu descrierea comunicată și cu cerințele legale aplicabile.' },
          { type: 'p', text: 'Utilizatorul trebuie să informeze Prestatorul într-un termen rezonabil despre orice problemă relevantă privind:' },
          { type: 'ul', items: ['imposibilitatea accesării;', 'lipsa materialelor promise;', 'funcționarea necorespunzătoare;', 'neconformitatea Conținutului digital;', 'erorile de facturare;', 'alte deficiențe.'] },
          { type: 'p', text: 'Sesizarea trebuie să includă suficiente informații pentru identificarea și reproducerea problemei.' },
          { type: 'p', text: 'Prestatorul poate solicita capturi de ecran, detalii despre dispozitiv, browser sau alte informații tehnice rezonabile.' },
          { type: 'p', text: 'În funcție de situație și de legea aplicabilă, Prestatorul poate:' },
          { type: 'ul', items: ['remedia problema;', 'oferi acces alternativ;', 'înlocui conținutul;', 'prelungi perioada de acces;', 'reduce proporțional prețul;', 'înceta contractul;', 'rambursa sumele datorate.'] },
        ],
      },
      {
        heading: '38. Limitarea răspunderii',
        blocks: [
          { type: 'p', text: 'Prestatorul răspunde pentru prejudiciile directe cauzate prin încălcarea culpabilă a obligațiilor sale, în limitele prevăzute de lege.' },
          { type: 'p', text: 'În măsura permisă de lege, Prestatorul nu răspunde pentru:' },
          { type: 'ul', items: ['pierderi indirecte;', 'pierderi de profit;', 'pierderi de oportunități;', 'decizii profesionale sau comerciale luate de Utilizator;', 'utilizarea necorespunzătoare a informațiilor;', 'lipsa unui anumit rezultat profesional;', 'defecțiuni ale echipamentelor Utilizatorului;', 'indisponibilitatea platformelor terțe;', 'informațiile introduse de Utilizator în aplicații externe;', 'acțiunile altor Participanți;', 'conținutul site-urilor terțe.'] },
          { type: 'p', text: 'În măsura permisă de lege, răspunderea totală a Prestatorului rezultată dintr-un anumit Serviciu nu va depăși valoarea efectiv achitată pentru Serviciul respectiv.' },
          { type: 'p', text: 'Limitările nu se aplică în cazurile în care răspunderea nu poate fi exclusă sau limitată potrivit legii, inclusiv în cazul intenției, culpei grave, vătămării corporale sau încălcării drepturilor obligatorii ale Consumatorului.' },
        ],
      },
      {
        heading: '39. Caracterul informativ al materialelor',
        blocks: [
          { type: 'p', text: 'Materialele și informațiile oferite au scop educațional general.' },
          { type: 'p', text: 'Acestea nu reprezintă, în lipsa unui contract distinct:' },
          { type: 'ul', items: ['consultanță juridică;', 'consultanță fiscală;', 'consultanță contabilă;', 'consultanță medicală;', 'consultanță financiară sau de investiții;', 'consultanță individualizată de securitate;', 'recomandări garantate pentru o situație concretă.'] },
          { type: 'p', text: 'Utilizatorul trebuie să solicite asistență specializată înainte de a lua decizii cu efecte juridice, financiare, medicale, de securitate sau profesionale semnificative.' },
        ],
      },
      {
        heading: '40. Lectorii și colaboratorii',
        blocks: [
          { type: 'p', text: 'Serviciile pot fi susținute de Lectori independenți, angajați, colaboratori sau reprezentanți ai unor parteneri.' },
          { type: 'p', text: 'Opiniile personale exprimate de Lectori nu reprezintă în mod automat poziția oficială a Prestatorului.' },
          { type: 'p', text: 'Lectorii sunt obligați să respecte cadrul contractual și regulile ISAD.academy, însă Prestatorul nu poate garanta că toate opiniile, exemplele sau afirmațiile acestora sunt aplicabile fiecărei situații individuale.' },
          { type: 'p', text: 'Prestatorul poate investiga reclamațiile referitoare la conduita unui Lector și poate lua măsurile pe care le consideră adecvate.' },
        ],
      },
      {
        heading: '41. Linkuri și resurse externe',
        blocks: [
          { type: 'p', text: 'Site-ul și materialele pot conține linkuri către site-uri, instrumente, articole, aplicații sau servicii operate de terți.' },
          { type: 'p', text: 'Prestatorul nu controlează și nu garantează:' },
          { type: 'ul', items: ['disponibilitatea;', 'securitatea;', 'exactitatea;', 'legalitatea;', 'politicile de confidențialitate;', 'condițiile comerciale'] },
          { type: 'p', text: 'ale resurselor externe.' },
          { type: 'p', text: 'Accesarea acestora se realizează pe răspunderea Utilizatorului și poate fi supusă termenilor furnizorului respectiv.' },
        ],
      },
      {
        heading: '42. Forța majoră și cazul fortuit',
        blocks: [
          { type: 'p', text: 'Niciuna dintre părți nu răspunde pentru neexecutarea obligațiilor cauzată de un eveniment de forță majoră sau de un caz fortuit, astfel cum sunt recunoscute de lege.' },
          { type: 'p', text: 'Pot constitui asemenea evenimente, în funcție de circumstanțe:' },
          { type: 'ul', items: ['dezastre naturale;', 'incendii;', 'epidemii;', 'pandemii;', 'conflicte armate;', 'atacuri cibernetice de amploare;', 'întreruperi majore de energie sau comunicații;', 'măsuri ale autorităților;', 'greve generale;', 'imposibilitatea obiectivă de deplasare;', 'alte evenimente externe, imprevizibile și inevitabile.'] },
          { type: 'p', text: 'Partea afectată va informa cealaltă parte într-un termen rezonabil și va depune eforturi pentru limitarea consecințelor.' },
        ],
      },
      {
        heading: '43. Suspendarea și încetarea accesului',
        blocks: [
          { type: 'p', text: 'Prestatorul poate suspenda sau înceta accesul Utilizatorului dacă acesta:' },
          { type: 'ul', items: ['nu achită sumele datorate;', 'partajează Contul;', 'copiază sau distribuie materialele;', 'perturbă desfășurarea Serviciului;', 'adoptă o conduită abuzivă;', 'încalcă obligațiile de confidențialitate;', 'încalcă regulile Comunității;', 'afectează securitatea Platformei;', 'desfășoară activități ilegale;', 'încalcă în mod semnificativ prezentele Termeni.'] },
          { type: 'p', text: 'Înainte de încetarea accesului, Prestatorul poate transmite un avertisment și poate oferi un termen de remediere, dacă natura încălcării permite.' },
          { type: 'p', text: 'În cazurile grave, accesul poate fi suspendat imediat.' },
          { type: 'p', text: 'Dacă încetarea este determinată de încălcarea culpabilă a obligațiilor de către Utilizator, acesta nu beneficiază automat de rambursare, fără a afecta drepturile obligatorii prevăzute de lege.' },
        ],
      },
      {
        heading: '44. Transferul participării',
        blocks: [
          { type: 'p', text: 'Transferul unui loc către o altă persoană este permis numai cu acordul Prestatorului și dacă:' },
          { type: 'ul', items: ['solicitarea este transmisă înainte de începerea Serviciului;', 'noul Participant îndeplinește cerințele programului;', 'nu a fost accesat Conținutul digital personal;', 'nu există restricții de certificare;', 'sunt furnizate datele necesare.'] },
          { type: 'p', text: 'Prestatorul poate refuza transferul în cazul Serviciilor personalizate, al abonamentelor individuale sau al conturilor deja activate.' },
        ],
      },
      {
        heading: '45. Comunicări',
        blocks: [
          { type: 'p', text: 'Comunicările dintre Prestator și Utilizator pot avea loc prin:' },
          { type: 'ul', items: ['e-mail;', 'telefon;', 'SMS;', 'WhatsApp;', 'Telegram;', 'notificări în Platformă;', 'alte mijloace comunicate.'] },
          { type: 'p', text: 'Utilizatorul trebuie să se asigure că datele sale de contact sunt actualizate și să verifice inclusiv directoarele de spam sau junk.' },
          { type: 'p', text: 'Notificările referitoare la executarea contractului pot fi transmise fără consimțământ de marketing, deoarece sunt necesare furnizării Serviciului.' },
        ],
      },
      {
        heading: '46. Reclamații',
        blocks: [
          { type: 'p', text: 'Orice reclamație privind serviciile oferite prin Platformă poate fi transmisă la adresa de e-mail: support@isad.academy' },
          { type: 'p', text: 'Reclamația trebuie să includă, după caz:' },
          { type: 'ul', items: ['numele Clientului;', 'adresa de e-mail utilizată la comandă;', 'Serviciul achiziționat;', 'numărul facturii sau comenzii;', 'descrierea situației;', 'soluția solicitată;', 'documentele relevante.'] },
          { type: 'p', text: 'Prestatorul va analiza reclamația și va transmite un răspuns într-un termen rezonabil, în raport cu complexitatea situației și termenele prevăzute de lege.' },
          { type: 'p', text: 'Părțile vor încerca soluționarea amiabilă a oricărui diferend.' },
        ],
      },
      {
        heading: '47. Soluționarea alternativă a litigiilor',
        blocks: [
          { type: 'p', text: 'Consumatorii pot utiliza mecanismele de soluționare alternativă a litigiilor puse la dispoziție de Autoritatea Națională pentru Protecția Consumatorilor, în condițiile legii.' },
          { type: 'p', text: 'Informațiile actualizate privind procedura SAL sunt disponibile pe site-ul Autorității Naționale pentru Protecția Consumatorilor.' },
          { type: 'p', text: 'Utilizarea unei proceduri alternative nu afectează dreptul Consumatorului de a se adresa instanțelor competente.' },
        ],
      },
      {
        heading: '48. Legea aplicabilă și instanțele competente',
        blocks: [
          { type: 'p', text: 'Prezentele Termeni și raporturile dintre Prestator și Utilizator sunt guvernate de legea română și de normele obligatorii aplicabile ale Uniunii Europene.' },
          { type: 'p', text: 'Orice neînțelegere va fi soluționată mai întâi pe cale amiabilă.' },
          { type: 'p', text: 'Dacă soluționarea amiabilă nu este posibilă, litigiul va fi soluționat de instanțele competente potrivit legii.' },
          { type: 'p', text: 'În raporturile cu Consumatorii, prezentele Termeni nu limitează dreptul acestora de a sesiza instanța competentă stabilită prin normele obligatorii de protecție a consumatorilor.' },
          { type: 'p', text: 'Pentru raporturile dintre profesioniști, părțile pot conveni prin contractul individual competența instanțelor de la sediul Prestatorului.' },
        ],
      },
      {
        heading: '49. Modificarea Termenilor și condițiilor',
        blocks: [
          { type: 'p', text: 'Prestatorul poate modifica periodic prezentele Termeni pentru a reflecta:' },
          { type: 'ul', items: ['schimbări legislative;', 'modificări ale Serviciilor;', 'introducerea unor funcționalități;', 'cerințe de securitate;', 'schimbări organizaționale;', 'recomandări ale autorităților;', 'corectarea unor erori.'] },
          { type: 'p', text: 'Versiunea actualizată va fi publicată pe Site împreună cu data ultimei actualizări.' },
          { type: 'p', text: 'Modificările se aplică, de regulă, pentru utilizările și achizițiile ulterioare publicării.' },
          { type: 'p', text: 'Modificările semnificative care afectează un Serviciu în desfășurare vor fi comunicate Utilizatorilor într-un mod rezonabil și nu vor reduce retroactiv drepturile deja dobândite, în afara cazurilor prevăzute de lege.' },
        ],
      },
      {
        heading: '50. Nulitatea parțială',
        blocks: [
          { type: 'p', text: 'Dacă o prevedere a prezentelor Termeni este declarată nulă, nelegală sau inaplicabilă, celelalte prevederi rămân valabile.' },
          { type: 'p', text: 'Prevederea afectată va fi interpretată sau înlocuită, în măsura permisă de lege, cu o prevedere valabilă care reflectă cât mai fidel scopul său inițial.' },
        ],
      },
      {
        heading: '51. Renunțarea la drepturi',
        blocks: [
          { type: 'p', text: 'Faptul că Prestatorul nu exercită imediat un drept prevăzut de acești Termeni nu reprezintă o renunțare la acel drept.' },
          { type: 'p', text: 'Orice renunțare este valabilă numai dacă este exprimată clar și, după caz, în scris.' },
        ],
      },
      {
        heading: '52. Întregul acord',
        blocks: [
          { type: 'p', text: 'Prezentele Termeni, împreună cu:' },
          { type: 'ul', items: ['Politica de confidențialitate;', 'Politica privind cookie-urile;', 'Politica de livrare;', 'politica de anulare aplicabilă;', 'oferta comercială;', 'formularul de comandă;', 'condițiile speciale ale Serviciului;', 'contractul individual, dacă există,'] },
          { type: 'p', text: 'formează cadrul contractual dintre Prestator și Utilizator.' },
        ],
      },
      {
        heading: '53. Documente disponibile pe Site',
        blocks: [
          { type: 'p', text: 'Utilizatorilor le este recomandat să consulte:' },
          { type: 'ul', items: ['Termenii și condițiile;', 'Politica de confidențialitate;', 'Politica privind cookie-urile;', 'Politica de livrare și acces;', 'politica de anulare și rambursare;', 'eventualele reguli ale Comunității;', 'condițiile specifice fiecărui Serviciu.'] },
          { type: 'p', text: 'Versiunea în vigoare este cea publicată pe https://isad.academy la data utilizării sau achiziționării Serviciului.' },
        ],
      },
      {
        heading: '54. Date finale de identificare',
        blocks: [
          { type: 'p', text: 'Prestator: INTERNATIONAL SECURITY AND DEFENCE S.R.L. Denumire comercială/platformă: ISAD.academy Cod unic de înregistrare: 44849076 E-mail general: contact@isad.academy E-mail pentru reclamații și retrageri: support@isad.academy Telefon: +40727 392 392 Website: https://isad.academy' },
          { type: 'p', text: 'Prezentele Termeni și condiții intră în vigoare la data de 21.07.2026 și rămân aplicabile până la înlocuirea lor cu o versiune actualizată.' },
          { type: 'p', text: 'INTERNATIONAL SECURITY AND DEFENCE S.R.L. Operatorul platformei ISAD.academy' },
        ],
      },
      {
        heading: '55. Conturi corporate și licențe Enterprise',
        blocks: [
          { type: 'p', text: 'Prestatorul poate furniza Serviciile și către persoane juridice, instituții publice, organizații neguvernamentale sau alte entități, prin intermediul unor licențe corporate sau al unor conturi organizaționale.' },
          { type: 'p', text: 'Administratorul desemnat de Client poate gestiona accesul participanților în limitele contractului încheiat.' },
          { type: 'p', text: 'Licențele corporate sunt netransferabile și pot fi utilizate exclusiv în cadrul organizației contractante.' },
          { type: 'p', text: 'Prestatorul poate limita numărul utilizatorilor, durata licenței și funcționalitățile disponibile conform ofertei comerciale.' },
        ],
      },
      {
        heading: '56. Licența de utilizare a Platformei',
        blocks: [
          { type: 'p', text: 'Prestatorul acordă Utilizatorului o licență limitată, personală, neexclusivă, revocabilă și netransferabilă pentru utilizarea Platformei exclusiv în scopul accesării Serviciilor contractate.' },
          { type: 'p', text: 'Licența nu conferă dreptul de:' },
          { type: 'ul', items: ['modificare;', 'decompilare;', 'reverse engineering;', 'reproducere;', 'comercializare;', 'integrare în alte produse;', 'dezvoltarea unor produse concurente.'] },
        ],
      },
      {
        heading: '57. Export Control și sancțiuni internaționale',
        blocks: [
          { type: 'p', text: 'Având în vedere că anumite Servicii pot aborda domenii precum:' },
          { type: 'ul', items: ['inteligență artificială;', 'securitate cibernetică;', 'prevenirea fraudelor;', 'apărare;', 'analiză de date;', 'criptografie;'] },
          { type: 'p', text: 'Prestatorul poate refuza furnizarea Serviciilor atunci când există obligații rezultate din:' },
          { type: 'ul', items: ['sancțiuni internaționale;', 'reglementări privind controlul exporturilor;', 'embargouri;', 'restricții impuse de legislația Uniunii Europene, ONU sau alte autorități competente.'] },
          { type: 'p', text: 'Prestatorul poate solicita informații suplimentare pentru verificarea eligibilității Clientului.' },
        ],
      },
      {
        heading: '58. Măsuri Anti-Piracy',
        blocks: [
          { type: 'p', text: 'Prestatorul utilizează măsuri tehnice și organizatorice pentru protejarea Conținutului.' },
          { type: 'p', text: 'Acestea pot include:' },
          { type: 'ul', items: ['watermark-uri;', 'identificarea utilizatorilor;', 'limitarea dispozitivelor;', 'jurnalizarea accesului;', 'detectarea distribuirii neautorizate;', 'suspendarea automată a accesului.'] },
          { type: 'p', text: 'Distribuirea ilegală a materialelor poate atrage răspunderea civilă și penală.' },
        ],
      },
      {
        heading: '59. Utilizarea statisticilor anonimizate',
        blocks: [
          { type: 'p', text: 'Prestatorul poate utiliza informații agregate și anonimizate privind utilizarea Platformei pentru:' },
          { type: 'ul', items: ['îmbunătățirea Serviciilor;', 'dezvoltarea unor noi programe;', 'realizarea de statistici;', 'cercetare;', 'rapoarte privind activitatea Platformei.'] },
          { type: 'p', text: 'Aceste informații nu permit identificarea Utilizatorilor.' },
        ],
      },
      {
        heading: '60. Arhivarea și ștergerea conturilor',
        blocks: [
          { type: 'p', text: 'Prestatorul poate arhiva sau șterge Conturile inactive după expirarea perioadelor legale sau contractuale.' },
          { type: 'p', text: 'Ștergerea contului nu afectează obligațiile fiscale, contractuale sau legale deja existente.' },
          { type: 'p', text: 'Prestatorul poate păstra anumite date atunci când acest lucru este impus de lege sau este necesar pentru apărarea drepturilor sale.' },
        ],
      },
      {
        heading: '61. Audit și conformitate',
        blocks: [
          { type: 'p', text: 'Pentru anumite Servicii destinate organizațiilor, Prestatorul poate efectua verificări privind respectarea condițiilor licenței și utilizarea conformă a Platformei.' },
          { type: 'p', text: 'Aceste verificări vor fi realizate cu respectarea legislației aplicabile și fără afectarea nejustificată a activității Clientului.' },
        ],
      },
      {
        heading: '62. Cod de conduită',
        blocks: [
          { type: 'p', text: 'Toți Utilizatorii trebuie să respecte principiile:' },
          { type: 'ul', items: ['respectului reciproc;', 'profesionalismului;', 'integrității;', 'confidențialității;', 'legalității;', 'nediscriminării.'] },
          { type: 'p', text: 'Prestatorul poate adopta un Cod de conduită separat, obligatoriu pentru anumite programe.' },
        ],
      },
      {
        heading: '63. Dispoziții privind dezvoltarea Platformei',
        blocks: [
          { type: 'p', text: 'Prestatorul poate modifica, extinde, reorganiza sau elimina funcționalități ale Platformei pentru:' },
          { type: 'ul', items: ['îmbunătățirea experienței utilizatorilor;', 'implementarea unor măsuri de securitate;', 'adaptarea la modificări legislative;', 'integrarea unor noi tehnologii.'] },
          { type: 'p', text: 'Aceste modificări nu vor afecta în mod nejustificat drepturile deja dobândite de Utilizatori.' },
        ],
      },
      {
        heading: '64. Versiuni lingvistice',
        blocks: [
          { type: 'p', text: 'Prestatorul poate publica Termenii și condițiile în mai multe limbi.' },
          { type: 'p', text: 'În cazul unor neconcordanțe între versiuni, prevalează versiunea în limba română, cu excepția cazurilor în care legea aplicabilă impune altfel.' },
        ],
      },
      {
        heading: '65. Dispoziții finale',
        blocks: [
          { type: 'p', text: 'Prezentele Termeni și condiții reprezintă acordul complet dintre Prestator și Utilizator privind utilizarea Platformei ISAD.academy.' },
          { type: 'p', text: 'Orice aspect neprevăzut în prezentul document va fi interpretat în conformitate cu legislația română și europeană aplicabilă.' },
        ],
      },
    ],
  },
}

export default terms
